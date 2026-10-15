# BORDERLINE: assets to download by hand (login required)

Some assets need a login, so they could not be fetched automatically. Download them into the
folder **`C:\Users\Lucifer.exe\Desktop\Pour Yoline\`** (the parent of the repo). Once there, they are
checked, optimised and moved into `borderline/assets/...`, and the originals are deleted from that
folder. Every licence below was checked on the asset's own page.

## Received and used (2026-10-15)

| What | Became |
|------|--------|
| Freesound 163457 (LeMudCrab, AK-47 shot, CC0) | `weapons/audio/shot_5.mp3` |
| Freesound 674742 (AK-47 unloaded/reloaded, CC0) | `weapons/audio/mag_out.mp3`, `mag_in.mp3` |
| Freesound 675008 (AK-47 cocked 3x, CC0) | `weapons/audio/bolt_back.mp3`, `bolt_fwd.mp3` |
| Freesound 210102 (GrayJoy casings, CC0) | `weapons/audio/casing_1..4.mp3` |
| Sketchfab "AK-47" by Beerus (CC-BY 4.0), 1K and 4K GLB and glTF zip | `weapons/ak47.glb` (from the 4K file, re-encoded) |
| itch.io "Free CC0 guns & explosives pack" (3dmodelscc0) | compared in game and not kept for the rifle |

**Received but not used:**
- Freesound 855841 and 855842 (serøutōnin--deprivəd shots): both recordings are clipped and much brighter than the rest of the shot set.

## Still open (optional)

| # | What | Page | Pick | Licence | Why |
|---|------|------|------|---------|-----|
| 1 | AK-47 Game Ready (Billy Jackman), 9.1k triangles, PBR | https://sketchfab.com/3d-models/dc58144409534abbb60970638d171f9f | Download 3D model, **glTF**, **2K** textures | CC-BY 4.0 | A lighter alternative to compare with the current model. Only worth it if the current one turns out too heavy on a weak machine. |
| 2 | Free Classic Weapons Pack (Stein Games) | Fab: search "Free Classic Weapons Pack" by Stein Games | the **glTF/GLB** or FBX archive | CC0 (to confirm on the Fab page) | More weapon models (for example a better sword). |

**Not needed: Mixamo.** The astronauts are not skinned meshes: they run on a custom procedural rig
in `js/hq/rig.js`, so Mixamo clips cannot drive them. Their poses are improved in code instead.
