# BORDERLINE · asset catalogue (ASSET-FIRST)

Rule: before hand-making a model, animation, texture, sound or effect, look here and in the
sources below for a free one of equal or better quality. Budget 0 €. CC0 first; CC-BY with a
credit line is fine; never paid, non-commercial (NC), no-derivatives (ND) or unclear licences.
JS components: MIT / BSD only, compatible with three r128 classic scripts (no npm, no bundler).

Everything external is declared once in `js/core/assets.js` (`Assets.LIST`) and loaded once,
lazily, shared by every user. Upgrades are plugged in from the outside by `js/game/assetfx.js`,
each keeping the hand-made version as the fallback (`?noassets` or `?ext=0` = the old look).
Test page: `lab.html?lab=sword|grapple|veil|stone` (see "Lab" below).

## 1. Assets in the repo

| id | cat. | used for | source page | author | licence (proof) | file | size | tris / px | r128 | anim. | lab result | default |
|----|------|----------|-------------|--------|-----------------|------|------|-----------|------|-------|------------|---------|
| `fx.slash` | VFX sprite | sword blow (crescent) | https://kenney.nl/assets/particle-pack (`slash_02`) | Kenney | CC0 (License.txt in the pack, page says CC0) | `fx/slash.png` | 7 KB | 256² L8 | yes | timed fade in assetfx | clearly better than the flat ring | **on** |
| `fx.twirl` | VFX texture | Valet veil shimmer | https://kenney.nl/assets/particle-pack (`twirl_02`) | Kenney | CC0 | `fx/twirl.png` | 13 KB | 256² L8 | yes | scrolled in shader | clearly better (glass outline instead of milky copy) | **on** |
| `tex.rope` / `tex.ropeN` | PBR texture | Dame grapple rope (albedo + normal GL) | https://ambientcg.com/view?id=Rope001 | ambientCG (Lennart Demes) | CC0 (https://docs.ambientcg.com/license/) | `textures/rope_col.jpg`, `rope_nrm.jpg` | 29 + 56 KB | 512×256 | yes | braid pitch per instance length (shader) | better up close, equal at 12 m (kit pink kept as glow) | **on** |
| `tex.stone.alb` / `.nrm` | PBR texture | every `Tex.mat('stone')` **of world 1** (Terre 39: city doors, fountain, cornice caps, pillars of ♠2, arena of ♥3 La Balance …), see section 7 | https://polyhaven.com/a/castle_wall_varriation | Poly Haven (Rob Tuytel) | CC0 (https://polyhaven.com/license) | `textures/stone_alb.webp` (2048², AO from the height baked in, 45 % desaturated, mean matched to the recipe), `stone_nrm.jpg` (1024², R,G = normal from the height map, B = roughness) | 949 + 237 KB | 2048 / 1024 | yes | – | clearly better (photo-scanned wall, tints kept) | **on** (world 1, lazy) |
| `sword.estoc` | model | Valet sword (opt-in) | https://polyhaven.com/a/antique_estoc | James Ray Cock, Ulan Cabanilla (Poly Haven) | CC0 | `models/sword_estoc.glb` (1K glTF repacked: 512 px JPEG textures, one GLB) | 383 KB | 8 246 tris, 3 maps 512² | yes (GLTFLoader r128, lazy) | uses the game's swing | more detailed up close, thinner than the stylised blade at play distance | opt-in `?ext=all` |
| `snd.swing1/2` | sound | sword swing (opt-in) | https://opengameart.org/content/swishes-sound-pack (`swish-7`, `swish-9`) | artisticdude | CC0 (page) | `sounds/swing1.mp3`, `swing2.mp3` | 3 KB each | mono 96 kb/s, loudnorm −16 LUFS | yes | – | not judged by ear yet | opt-in |
| `snd.swing3` | sound | sword swing (opt-in) | https://opengameart.org/content/rpg-sound-pack (`battle/swing.wav`) | artisticdude | CC0 (page) | `sounds/swing3.mp3` | 4 KB | idem | yes | – | idem | opt-in |
| `snd.swordHit1/2` | sound | blade landing on an enemy (opt-in) | https://kenney.nl/assets/impact-sounds (`impactMetal_light_001/004`) | Kenney | CC0 | `sounds/sword_hit1.mp3`, `sword_hit2.mp3` | 4 KB each | idem | yes | – | idem | opt-in |
| `snd.grappleFire` / `snd.grappleOut` | sound | grapple shot / rewind (opt-in) | https://opengameart.org/content/rpg-sound-pack (`sword-unsheathe2/5`) | artisticdude | CC0 | `sounds/grapple_fire.mp3`, `grapple_out.mp3` | 5–6 KB | idem | yes | – | idem (a stand-in: a real grapple recording is in INBOX) | opt-in |
| `snd.grappleHit` | sound | hook bites | https://kenney.nl/assets/impact-sounds (`impactMetal_medium_001`) | Kenney | CC0 | `sounds/grapple_hit.mp3` | 3 KB | idem | yes | – | idem | opt-in |
| `snd.cloak` | sound | Valet veil on | https://kenney.nl/assets/sci-fi-sounds (`forceField_001`) | Kenney | CC0 | `sounds/cloak.mp3` | 12 KB | idem | yes | – | idem | opt-in |

Total in `borderline/assets/` (this branch): **1.47 MB** (of which 0.98 MB loaded by default,
in the background, after the game has started; the estoc and the sounds only with `?ext=all`).
Runtime-only dependency: `three@0.128.0/examples/js/loaders/GLTFLoader.js` (MIT, same CDN and
version as three.min.js, jsDelivr then unpkg), fetched only when a model is first asked for.

Animation lab (`anim/`, used only by `animlab.html`, not by the game yet; details and hashes in
`anim/README.md`): `anim/ual_mannequin.glb` (Quaternius, Universal Animation Library 1 + 2
Standard, CC0, 24 clips, 1.6 MB), `anim/ual_mannequin_f.glb` (Quaternius, UAL2 Standard, CC0,
1.4 MB), `anim/kaykit_knight.glb` (Kay Lousberg, KayKit Adventurers 1.0, CC0, 8 clips, 0.5 MB).

## 2. Downloaded, inspected, not kept

| asset | source / licence | why not |
|-------|------------------|---------|
| Antique Katana 01 (6 670 tris, 1K = 631 KB, repacked 323 KB) | Poly Haven, CC0 | a thin katana, reads even less than the estoc in third person; not the Valet's longsword |
| Wooden Handle Saber (4 031 tris, repacked 222 KB) | Poly Haven, CC0 | good curved silhouette, but a sabre with wooden grip: off the "knight" look of world 5 |
| Medieval Blocks 02 (2K) | Poly Haven, CC0 | rubble wall, too far from the ashlar recipe the levels were tinted for |
| Kenney RPG Audio, Impact Sounds, Sci-fi Sounds, Particle Pack (whole packs) | kenney.nl, CC0 | only the files listed above were copied; the rest is a good reserve (footsteps on 5 surfaces, doors, metal, thrusters `thrusterFire_*`, `spaceEngine*`, force fields, `muzzle_*`/`smoke_*`/`fire_*` sprites) |
| OGA "3 Melee sounds" | OpenGameArt, CC0 | longer, muddier swings than the swishes pack |
| "Free CC0 guns & explosives pack" (3dmodelscc0, FBX) | itch.io, CC0, fetched by the user | firearms and explosives only (no blade, the "Claymore" is the mine) → weapons agent's scope |

## 3. Sources reviewed

| source | licence | access | what it is good for here |
|--------|---------|--------|--------------------------|
| **polyhaven.com** (models, textures, HDRIs) | CC0 | public API (`api.polyhaven.com/files/<id>`), no login | the best match for the game's semi-real PBR look: props (lanterns, watering can, street lamps, benches, crates, barrels, boulders, rocks), weapons (estoc, katana, sabre, dagger, mace, war hammer, kite shield), 2K/4K scanned textures |
| **ambientcg.com** | CC0 | public (`ambientcg.com/get?file=<Id>_1K-JPG.zip`) | tiling PBR materials (rope, nets, metals, planks, fabric); same channel layout as Tex |
| **kenney.nl/assets** | CC0 | public zips | sounds (RPG, impact, sci-fi, UI), particle sprites, stylised kits (low-poly: off-style for characters/props, fine for UI and VFX) |
| **opengameart.org** | per asset (filter CC0) | public | sound packs (swishes, RPG sound pack); 3D quality uneven |
| **quaternius.com / poly.pizza** | CC0 | public | low-poly flat-coloured models (swords, nature, props): readable but off the game's PBR art direction; poly.pizza has no free API |
| **cgbookcase.com** | CC0 | public | textures (similar to ambientCG) — not needed yet |
| **pixor.art/library** | own licence, to check per item | – | not used: no clear licence text found for redistribution in a public repo |
| **freesound.org** | per sound (filter CC0) | **login to download** | real recordings: swooshes, grapple, metal; see INBOX |
| **mixamo.com** | free with Adobe login | login | **not usable**: Mixamo retargets skinned humanoid meshes; our astronauts are procedural parts on a custom FK/IK rig (`js/hq/rig.js`, `js/hq/astro.js`), not skinned meshes, so its clips cannot drive them (poses stay in code) |
| GitHub (MIT/BSD, r128 globals) | MIT | public | `three@0.128.0/examples/js/*` (GLTFLoader, RGBELoader, DRACOLoader, Reflector/Water, Sky, Lensflare…) all match the CDN version and the global `THREE` |

## 4. Audit of equipment and powers (from the code)

Class: **H** hand-made and fine as is · **R** reusable component · **X** replaceable by an asset.

| system | where (code) | model / textures | animation | VFX | sound | co-op | class / asset-first verdict |
|--------|--------------|------------------|-----------|-----|-------|-------|------------------------------|
| Rifle (AKM) | weapons.js, combat.js, avatar.js holdGun | canvas 2048 procedural | rig keyframes (reload) | muzzle flash, puffs, hit bursts | synth | snapshot + `shot` msg | **weapons agent** (not touched here) |
| Sword | weapons.js `sword()`, combat.js `punch()` / `slash()` | extruded shape + emissive steel | holder arc (`swing`) | flat ring → **Kenney crescent** | synth `punch` → samples (opt-in) | `slash` msg, all clients draw it | model X (estoc ready, opt-in), slash **X done**, swing H |
| Grapple (Dame) | rope.js (Verlet, 18 instanced segments), player.js mode `grapple` | neon tube + octahedron hook | shoot / taut / retract | – | synth `grapple*` → samples (opt-in) | rope drawn for the partner from the snapshot target | rope **X done** (ambientCG), hook: no free hook model found (Poly Haven / poly.pizza) → H |
| Double jump / flip, sprint, land | player.js | – | rig poses | dust? none | synth `jump`, `djump`, `flip`, `land`, `step` | snapshot | H; footsteps per surface → Kenney Impact `footstep_*` (5 surfaces) X candidate |
| Valet veil (cloak) | combat.js (F, 6 s / 15 s), avatar.js `ghost()` | flat additive copy → **fresnel shimmer** | – | + light burst | synth `cloak` → sample (opt-in) | snapshot bit 15, partner sees it | **X done** (shader + Kenney twirl) |
| Dame slow time ("ralenti") | tr_d7.js, tr_s4.js, tr_c7.js | – | time scale on balanciers | screen tint | synth | host-auth | H (pure gameplay); a whoosh/heartbeat sample would help |
| Portals | portes.js (levels + world) | shader rift | – | portal shader | synth `portal`, `portalShoot` | host-auth | H (shader is the asset) |
| Frost bolts ("givre") | tr_s6.js | procedural | – | bolts on both screens | synth | host-auth | H; ice texture → ambientCG `Ice00x` X candidate |
| Lantern | tr_h4.js, balade.js | procedural lantern + PointLight | carried | glow | synth `lantern` | host-auth | X candidate: Poly Haven `wooden_lantern_01` / `vintage_oil_lamp` / `Lantern_01` |
| Umbrella | tr_h8.js | procedural canvas fabric | open/close | rain | synth | host-auth | H (custom heart fabric is narrative) |
| Watering can / little sun | tr_h6.js | procedural | carried | water drops | synth | host-auth | X candidate: Poly Haven `watering_can_metal_01` (11 837 tris; needs a 512 repack) |
| Cable (world 2) | tr_c1.js, tr_c7.js | tubes | Verlet | – | synth `creak` | host-auth | R: same Rope component (texture upgrade applies if it uses Rope.create; it builds its own tubes today) |
| Carry / throw, plates, levers, dials | many tr_*.js | primitives + Tex | scripted | bursts | synth | host-auth | H (gameplay props); metal/wood maps already Tex |
| Thrusters / pilot (W6), backpack | tr_s5.js, tr_c7.js, astro.js | procedural | – | flames | synth | host-auth | sounds X candidate: Kenney `thrusterFire_*`, `spaceEngine*` |
| Decor: stone | `Tex.mat('stone')` ×43 | procedural ashlar 2048 | – | – | – | – | **X done** (Poly Haven castle wall) |
| Decor: metal ×54, marble ×41, wood ×33, rock ×29, plaster ×22 | `Tex.mat(...)` | procedural 2048 (web worker) | – | – | – | – | X candidates, same path (`Tex.external`): ambientCG `Metal0xx`, Poly Haven `marble_01`, `wood_planks`, `rock_face` … one kind at a time, through the lab |
| Enemies, bosses, Oracle | enemy-models.js, foes.js, boss.js, oracle.js | primitives | code | bursts | synth | host-auth | H (stylised, designed per fight) |
| Astronauts | hq/astro.js, hq/rig.js | procedural PBR parts | custom FK/IK rig | – | – | snapshot | H (Mixamo incompatible, see above) |

## 5. Reusable systems (proposal, nothing rewritten)

The systems already share more than it seems; the asset layer adds the missing common pieces
without touching the play logic:

* **One loader / cache** (`Assets`): models, textures, sounds, the CDN loader scripts, retries,
  stats. Every system asks by id.
* **Sound by name** (`assetfx.js` `SAMPLES`): `Sound.play('punch')` stays the only API; a game
  sound name maps to recorded variants (random, never twice in a row, pitch jitter, positional
  when the call passes a position) and falls back to the synth. The rifle can use the same map
  (`shoot`, `reload`) instead of its own player when the weapons agent wants.
* **Held item mount**: rifle and sword already share `Weapons.attach` (holder on the avatar,
  `muzzle()`, `fire()`); a GLB just replaces the children of a model group (done for the sword
  by capture, without editing weapons.js). Lantern, watering can, umbrella could join the same
  holder instead of each level parenting its own mesh to the hand.
* **Line / rope**: one Verlet rope (`Rope.create`) for the grapple; the world-2 cable and the
  winch build their own tubes. Using `Rope.create` for them would give them the braid texture
  and the shoot/retract feel for free.
* **Impact / trail VFX**: `Fx.burst` (6 000 pooled points) is shared by everything; textured
  sprites (Kenney slash, smoke, spark, scorch) are the next step: one pooled quad system
  (`slashFx` is its first user) for slashes, muzzle smoke, hook sparks, frost hits.
* **Environment for metal**: PMREM renders black on this setup (checked again in the lab), so
  every metal asset needs the injected studio env (`Assets.envify`), like `CineKit2.envify`.
* **Surface materials**: `Tex.external(kind, albedo, data, tiling)` lets any procedural kind be
  replaced by scanned maps for every level at once, tints and triplanar mapping kept.

## 6. Lab and measures

`borderline/lab.html` loads the real `index.html` (always current) plus `js/lab/lab.js`:
one test room per system in the Garde arena, a live panel (fps, draw calls of one full frame,
triangles, geometries, textures, programs, asset files and KB, JS heap) and `Lab.press(action)`
for scripted tests. Solo: `lab.html?lab=sword` (Valet), `?lab=grapple` (Dame), `?lab=veil`,
`?lab=stone`. Co-op: add `&local=X&role=yoline&host=1&auto=1` / `&local=X&role=william&auto=1`.
`&ext=0` = hand-made, `&ext=1` = default set, `&ext=all` = everything (estoc + sounds).

Measured (headless Chrome, D3D11 on the RX 7900 GRE, 960×540, GPU time of one full frame with
`gl.finish`, 120 frames):

| room | ext=0 | ext (assets) | draw calls | textures | notes |
|------|-------|--------------|------------|----------|-------|
| sword (all, estoc) | 0.83 ms | 0.82 ms | 230 → 226 | 51 → 56 | +8.2k tris per sword |
| veil (cloak on) | 0.71 ms | 0.78 ms | 230 → 226 | 51 → 57 | |
| stone gallery | 0.86 ms | 0.98 ms | 212 → 212 | 51 → 53 | first frame after load 9 ms (2048² upload + mips, once) |
| grapple (taut) | 0.87 ms | 0.96 ms | 201 → 200 | 51 → 55 | |

FPS stays at the 180 cap in every room. Default download: 0.98 MB after start (stone 920 KB,
rope 85 KB, sprites 20 KB); `?ext=all` adds the estoc (383 KB), GLTFLoader and 45 KB of sounds.
Co-op (two pages, Yoline host + William): the partner sees the estoc in the Valet's hand, the
textured slash of a remote blow (21 frames observed) and the veil shimmer (188 meshes swapped)
on the remote avatar; act1, act2, donjon, garde, balade and final entered on both roles with no
console error.

## 7. Look pass: Terre 39 prototype (semi-realistic, branch `assets-lab`)

Art direction (user, 2026-10-15): **option 1**, keep the scenery geometry; realistic PBR textures,
sounds, VFX and skies from the local CC0 library (`BORDERLINE_ASSETS_LIBRARY`, 55 packs, not in git);
semi-realistic, immersive, coherent, one identity per world, never low-poly cartoon. Kenney 3D
models only for secondary props, only after a visual check. Built first on Terre 39 (city hub,
♠2 « Premiers pas », ♠4 « Les Toits qui tombent »), then **stop for validation** before the other worlds.

Code: `js/world/look.js` (flags, scan registry, night environment, street-lamp lighting chunk,
per-scene light balance, camera-near point lights), `Tex.register / Tex.rescope` in
`js/world/textures.js` (lazy scanned sets with normal maps, per world), the street and facade
shaders in `js/world/city.js`, the Kenney sound rules in `js/game/assetfx.js`.
The lab's stone room (`lab.html?lab=stone`) stands in the Garde arena (world 5), so it shows the
procedural stone unless `&tex=all` is added.
Flags: `?look=0` (or `?noassets`) = the game exactly as before; `?look=tex,ground,lamps,env,grade,sound`
= only those parts; `&tex=all` = the scans in every world.

### Integrated

| id / file | what | source (library path) | author | licence | processing | size | where | default |
|-----------|------|-----------------------|--------|---------|------------|------|-------|---------|
| `tex.asphalt.alb` / `.nrm` = `textures/asphalt_alb.webp`, `asphalt_nrm.jpg` | asphalt scan | `03_TEXTURES_PBR/asphalte/asphalt_01` = https://polyhaven.com/a/asphalt_01 | Poly Haven | CC0 | AO baked, 85 % desaturated, mean matched to the recipe (0.205); nrm = normal XY + roughness, JPEG 4:4:4 | 125 + 414 KB (1024², 1024²) | city streets (street shader), roofs of ♠4, every world-1 `Tex.mat('asphalt')` | on |
| `tex.stone.*` | castle wall scan (row above, now with a normal map) | https://polyhaven.com/a/castle_wall_varriation (from the asset lab) | Poly Haven | CC0 | normal + cavity AO computed from its height map | 949 + 237 KB | world-1 stone | on |
| `tex.wood.alb` / `.nrm` = `textures/wood_*` | wooden planks scan | `03_TEXTURES_PBR/bois/wooden_planks` = https://polyhaven.com/a/wooden_planks | Poly Haven | CC0 | AO baked, per-channel mean matched to the recipe (0.52, 0.32, 0.18) so the level tints keep their colour | 374 + 213 KB (2048², 1024²) | benches, doors, crates, water towers of ♠4 … (world 1) | on |
| `tex.c10stone.alb` / `.nrm` = `textures/c10_towerstone_alb.webp`, `c10_towerstone_nrm.jpg` | stone wall scan | `03_TEXTURES_PBR/pierre/stone_wall` = https://polyhaven.com/a/stone_wall | Poly Haven | CC0 | AO baked (softened), 20 % desaturated, mean 0.42; nrm = normal XY + roughness, JPEG 4:4:4 q78 | 140 + 430 KB (1024²) | ♣10 « La Tour de Babel » only (its own materials, `js/world/tr_c10.js`): both towers, the parvis, the steles, the mesa (the level also reuses `tex.wood` for its floors, stairs and drawbridges) | on (lazy) |
| `tex.c10brick.alb` / `.nrm` = `textures/c10_brick_*` | brick wall scan | `03_TEXTURES_PBR/brique/brick_wall_001` = https://polyhaven.com/a/brick_wall_001 | Poly Haven | CC0 | idem | 220 + 339 KB (1024²) | ♣10 only: inner walls of the halls, stairwells | on (lazy) |
| `tex.c10metal.alb` / `.nrm` = `textures/c10_rustmetal_*` | green rusted metal scan | `03_TEXTURES_PBR/metal/green_metal_rust` = https://polyhaven.com/a/green_metal_rust | Poly Haven | CC0 | idem | 60 + 35 KB (1024²) | ♣10 only: bells, rings, levers, the lift's cage, the crown's petals (tinted bronze / verdigris) | on (lazy) |
| `tex.d10rock.alb` / `.nrm` = `textures/d10_rock_alb.webp`, `d10_rock_nrm.jpg` | rock face scan | `03_TEXTURES_PBR/roche/rock_face` = https://polyhaven.com/a/rock_face | Poly Haven | CC0 | AO baked (softened), 70 % desaturated, mean 0.42; nrm = normal XY + roughness, JPEG 4:4:4 q76 | 154 + 366 KB (1024²) | ♦10 « Le Lac gelé » only (its own materials, `js/world/tr_d10.js`): islands, ridge, cliffs of the basin (the level also reuses `tex.wood` for its windbreaks and sled) | on (lazy) |
| `tex.d10snow.alb` / `.nrm` = `textures/d10_snow_alb.webp`, `d10_snow_nrm.jpg` | snow, made from a coast sand scan | `03_TEXTURES_PBR/sable/coast_sand_rocks_02` = https://polyhaven.com/a/coast_sand_rocks_02 | Poly Haven | CC0 | luminance only, lifted to 0.86 ± 0.05, cavities tinted blue (light inside the snow), relief flattened to 55 %, roughness 0.72 ± 0.25 | 154 + 297 KB (1024²) | ♦10 only: snow caps of the shores, islets and ridge, the frozen basin | on (lazy) |
| `tex.h10.floor.alb` / `.nrm` = `textures/h10_floor_alb.webp`, `h10_floor_nrm.jpg` | harlequin floor, made from a stone tile scan | `03_TEXTURES_PBR/carrelage/floor_tiles_08` = https://polyhaven.com/a/floor_tiles_08 | Poly Haven | CC0 | tiled 2 × 2 (10 × 10 stones, so the checker wraps), stones recoloured ivory / wine-black on the measured grout grid, grain and AO kept; nrm = normal XY + roughness (polished dark stones, honed ivory, rough grout), JPEG 4:4:4 q80 | 79 + 74 KB (1024²) | ♥10 « Le Marché » only (its own materials, `js/world/tr_h10.js`): every floor of the market (the level also reuses `tex.stone` for kerbs, pylons and the door frame, `tex.wood` for stalls and lecterns, and ♦10's `tex.d10rock` for the islands' undersides) | on (lazy) |
| `tex.h10.plaster.alb` / `.nrm` = `textures/h10_plaster_*` | plaster scan | `03_TEXTURES_PBR/platre/plastered_wall` = https://polyhaven.com/a/plastered_wall | Poly Haven | CC0 | AO baked, 65 % desaturated, mean 0.72; nrm = normal XY + roughness, JPEG 4:4:4 q80 | 150 + 324 KB (1024²) | ♥10 only: columns, the loges' walls, the stalls and booths (ivory, and tinted wine-red) | on (lazy) |
| `tex.s_slate.alb` / `.nrm` = `textures/s_slate_alb.webp`, `s_slate_nrm.jpg` | cold slate tiles, made from a stone tile scan | `03_TEXTURES_PBR/carrelage/floor_tiles_08` = https://polyhaven.com/a/floor_tiles_08 | Poly Haven | CC0 | AO baked, luminance only (contrast +25 %), a cold cast, mean 0.42; nrm = normal XY + roughness (honed 0.35–0.9), JPEG 4:4:4 q78 | 104 + 63 KB (1024²) | the ♠ table of the Cour only (its own materials, `js/world/cour_s.js`): every floor of the Armurerie de Pique, the gallery's stairs, the throne's dais (the table also reuses ♣10's `tex.c10stone` for its walls and `tex.wood` for racks and drawbridges) | on (lazy) |
| `tex.s_iron.alb` / `.nrm` = `textures/s_iron_alb.webp`, `s_iron_nrm.jpg` | blackened iron, made from a painted metal scan | `03_TEXTURES_PBR/metal/green_metal_rust` = https://polyhaven.com/a/green_metal_rust | Poly Haven | CC0 | AO baked, luminance only (contrast +60 %), the rust runs darkened, a cold cast, mean 0.42; nrm = normal XY + roughness, JPEG 4:4:4 q78 | 100 + 35 KB (1024²) | the ♠ table only: the grille, pillars, iron walks, portcullises, pilasters, vault ribs, braziers | on (lazy) |
| `tex.ccmarble.alb` / `.nrm` = `textures/cc_marble_alb.webp`, `cc_marble_nrm.jpg` | green marble mosaic, made from a marble tile scan | `03_TEXTURES_PBR/marbre/marble_tiles` = https://polyhaven.com/a/marble_tiles | Poly Haven | CC0 | AO baked, recoloured verde antico (the pale stone mid green, its dark flecks black-green veins, grout dark), mean 0.24; nrm = normal XY (80 %) + roughness remapped polished 0.18–0.73, JPEG 4:4:4 q78 | 264 + 198 KB (1024²) | the ♣ table of the Cour only (its own materials, `js/world/cour_c.js`): the floors of the hall of ropes, the gallery of pulleys and the rotunda, the parapets and the balance (the table also reuses `tex.wood`, `tex.stone`, ♣10's `tex.c10metal` for the verdigris pulleys and ♦10's `tex.d10rock` for the rock under the hall) | on (lazy) |
| `tex.dcour.mosaic.alb` / `.nrm` = `textures/dcour_mosaic_alb.webp`, `dcour_mosaic_nrm.jpg` | warm marble mosaic, made from a marble tile scan | `03_TEXTURES_PBR/marbre/marble_tiles` = https://polyhaven.com/a/marble_tiles | Poly Haven | CC0 | AO baked, recoloured honey-cream (deep pits umber), mean 0.58; nrm = normal XY (80 %) + roughness remapped polished 0.28–0.73, JPEG 4:4:4 q78 | 224 + 188 KB (1024²) | the ♦ table of the Cour only (its own materials, `js/world/cour_d.js`): every floor of the Observatoire de Carreau (the table also reuses ♥10's `tex.h10.plaster` for its walls, ♣10's `tex.c10stone` for door frames and the rock, and `tex.wood`) | on (lazy) |
| `tex.hcour.marble.alb` / `.nrm` = `textures/hcour_marble_alb.webp`, `hcour_marble_nrm.jpg` | rose marble mosaic, made from a marble tile scan | `03_TEXTURES_PBR/marbre/marble_tiles` = https://polyhaven.com/a/marble_tiles | Poly Haven | CC0 | AO baked, recoloured blush rose (its dark flecks turned to soft wine veins, grout dark), mean 0.56; nrm = normal XY (80 %) + roughness remapped polished 0.24–0.69, JPEG 4:4:4 q80 | 175 + 200 KB (1024²) | the ♥ table of the Cour only (its own materials, `js/world/cour_h.js`): the conservatory's floor, the garden's disc, the belvédère, the galleries, the stalls and the carousel (the table also reuses `tex.wood` for the parquet and the stage, `tex.stone` warmed to a rose stone for the walls, ♥10's `tex.h10.plaster` for the ceilings and ♦10's `tex.d10rock` for the rock) | on (lazy) |
| `tex.hcour.velvet.alb` / `.nrm` = `textures/hcour_velvet_alb.webp`, `hcour_velvet_nrm.jpg` | rose velvet, made from a denim scan | `03_TEXTURES_PBR/tissu/denim_fabric` = https://polyhaven.com/a/denim_fabric | Poly Haven | CC0 | AO baked, the weave's luminance kept (its seams read as curtain panels), tinted deep rose, mean 0.25; nrm = normal XY (70 %) + roughness 0.72–0.94 (matt), JPEG 4:4:4 q80 | 209 + 109 KB (1024²) | the ♥ table only: drapes and curtains, the great curtain of the theatre, the stalls' armchairs, the table cloths, the music box | on (lazy) |
| `fx.cone` = `fx/lamp_cone.png` | soft light cone under the 676 street lamps | `05_UI_ET_VFX/Kenney_light-masks/Default/cone_d_blur.png` | Kenney | CC0 | luminance, flipped, 128×256 | 3 KB | city (one instanced draw call) | on |
| `sounds/kenney/card_slide_1..3`, `card_place_1..3` | card won: slid out and laid down, under the chime | `04_SONS/04_CARTES/Kenney_casino-audio` | Kenney | CC0 | trimmed, RMS −20 dBFS, peak ≤ −3 dBFS, mono MP3 80 kb/s | 6–9 KB each | `Sound.play('card')` (layered) | on |
| `sounds/kenney/card_fan_1..2`, `card_shove_1..3` | deck menu opened / closed (P / Tab) | idem | Kenney | CC0 | idem (−22 / −24 dBFS) | 7–13 KB | deck menu | on |
| `sounds/kenney/ui_click_1..3` | menu clicks | `04_SONS/03_INTERFACES/Kenney_interface-sounds` (`click_001`, `select_001/002`) | Kenney | CC0 | idem | 0–1 KB | `Sound.play('ui')` (replaces the synth) | on |
| `sounds/kenney/step_concrete_0..4`, `step_wood_0..4` | footsteps by surface (wood on benches / wooden boxes, concrete elsewhere) | `04_SONS/01_IMPACTS_ET_COMBAT/Kenney_impact-sounds` | Kenney | CC0 | −26 dBFS, played at 0.3–0.65 gain, never the same twice, ±7 % pitch | 1–3 KB | `Sound.play('step')` (replaces the noise tick) | on |
| `sounds/kenney/land_0..2` | landing | idem (`impactSoft_heavy`) | Kenney | CC0 | −22 dBFS | 5–6 KB | `Sound.play('land')` | on |
| `sounds/kenney/switch_latch`, `switch_click` | levers | `Kenney_rpg-audio` (`metalLatch`, `metalClick`) | Kenney | CC0 | −20 dBFS | 3–5 KB | `Sound.play('switch')` (layered under the bell) | on |
| `sounds/kenney/creak_1..3` | wood creaks (winch, bridges) | `Kenney_rpg-audio` | Kenney | CC0 | −24 dBFS | 3–8 KB | `Sound.play('creak')` (replaces the square-wave creak) | on |
| `sounds/kenney/glass_0..2` | glass breaking | `Kenney_impact-sounds` (`impactGlass_heavy`) | Kenney | CC0 | −20 dBFS | 3–4 KB | `Sound.play('shatter')` (layered) | on |

Not an asset but part of the pass (code only): the city street lit by its real lamps (inverse-square
pools with a downward lantern distribution, GGX glints on the scanned asphalt normal and roughness,
puddles in low spots and a wet strip along the kerbs that mirror the facades and the shop windows,
shopfront spill on the pavements, contact darkening where the facades meet the ground), lamp light
on the lower floors of the facades, the plaza lit by its fountain and the big screen, 3 real point
lights following the lamps nearest to the view + the fountain (props and avatars), a night
environment reflected by metal / varnish / wet stone (lamp posts and benches were black
silhouettes), light balance per scene (moonlight vs sodium lamps; a low moon sheen on the roofs of
♠4; a cool key over the void of ♠2), and anti-aliased procedural relief (brushed metal no longer
streaks under the lamps).

### Rejected (or kept for later)

| asset | why |
|-------|-----|
| `03_TEXTURES_PBR/pierre/stone_wall` (Poly Haven rubble wall) | compared in the lab with the castle wall under the same tints: a rough rubble wall, reads "dungeon / countryside", not city masonry. **Candidate for Profondeurs (W5) / caves.** Packed and ready (`stonewall_*`, not in the repo). |
| Kenney 3D props for Terre 39 (retro-urban kit: dumpster, bench, pallet, barrier, street light; suburban planter) | placed in the plaza under the new lighting: flat-coloured toy proportions, near-white atlases under the game's linear output, and the GLBs use `KHR_texture_transform` UV sets that three r128 does not support. They do not blend with the scanned materials. Not integrated. |
| Kenney city kits (commercial / suburban / industrial buildings) | low-poly whole buildings: replacing the city geometry is out of scope (option 1) and off style. |
| Kenney skyboxes (`03_TEXTURES_SUPPLEMENTAIRES/Kenney_skyboxes`, day / dusk / night / pink) | painted, cartoon-soft clouds; the city sky is narrative (the heart-galaxy, the Oui, fills card by card) and better. Night clouds might suit Céleste (W2) as a far layer: to judge there. |
| Kenney splat pack | cartoon paint splats: the puddles and grime are shaped procedurally in the street shader instead (softer, no tiling). |
| Kenney footsteps on grass / snow / carpet, casino chips / dice | no matching surface or event in the prototype scenes (grass: La Rivière, to add with world 1 generalisation). |
| Kenney doorOpen / doorClose (RPG audio) | wooden house doors; the game's `door` sound serves stone rift doors and metal cabins: would not match. Kept for wooden doors of world 4 (Conte). |
| Ambience loops | none in the 55 packs (Kenney sci-fi has engine hums only). The synth city ambience stays. |
| Interface clicks `click_002..005` | 10 ms clicks, too short to read; `select_001/002` used instead. |

### Measured (headless Chrome, D3D11 on the RX 7900 GRE, 1280×720, one full frame with `gl.finish`)

| scene (view) | draw calls before → after | GPU ms before → after | fps before → after |
|--------------|---------------------------|-----------------------|--------------------|
| city street (v1) | 909 → 910 | 9.1 → 8.9–9.7 | 158 → 146–159 |
| city plaza (v2) | 697 → 698 | 6.9 → 7.5 | 172 → 168 |
| ♠4 rooftops | 1247 → 1246 | 15.5 → 15.3–15.7 | 119 → 115 |
| ♠2 void stage | 538 → 538 | 2.2 → 2.3 | 180 → 180 (cap) |

GPU texture memory after visiting the city, ♠4 and ♠2: **833 MB → 769–785 MB** (the three scans
at 2048/1024 replace three pairs of 2048² procedural maps). Downloads: +2.3 MB of scans, +3 KB cone,
+170 KB of sounds (after the first click), each scan fetched only when a world-1 level first uses
its kind. City ready (page start → all maps final): 5.44 s → 5.47 s (the scans arrive while the
procedural maps are being made). Shader programs: +16 (point lights in the city phases, the night
environment variant) — compiled once, on the first visit.
