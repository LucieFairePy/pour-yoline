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
| `tex.stone.alb` / `.dat` | PBR texture | every `Tex.mat('stone')` (arena, maze, crypt, balade masonry, city, doors, finale) | https://polyhaven.com/a/castle_wall_varriation | Poly Haven (Rob Tuytel) | CC0 (https://polyhaven.com/license) | `textures/stone_alb.webp` (2048², desaturated 45 %, mean 0.47 so level tints still work), `stone_dat.webp` (1024², R = height, G = roughness) | 710 + 210 KB | 2048 / 1024 | yes (WebP) | – | clearly better (photo-scanned wall, tints kept) | **on** (not loaded on quality=low) |
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
