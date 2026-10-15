# BORDERLINE: assets to download by hand (login required)

(Section written on the `assets-lab` branch. When merging, append it under the weapons
section of the same file instead of replacing that file.)

## Sword, grapple, veil (asset lab)

These need a free Freesound login, so they could not be fetched automatically. Download them
into **`C:\Users\Lucifer.exe\Desktop\Pour Yoline\téléchargements\`**. Each page was checked:
licence **CC0** (shown on the page, "Creative Commons 0"). They are then trimmed, normalised,
converted to small mono MP3 and compared in `lab.html` against the current stand-ins.

| # | What | Page | Pick | Expected file | Licence | Why |
|---|------|------|------|---------------|---------|-----|
| 1 | Clean fast swoosh (0.9 s) | https://freesound.org/people/Danjocross/sounds/507466/ | "Download" (original AIFF) | `507466__danjocross__clean-fast-swoosh.aiff` | CC0 | A cleaner, fuller sword swing than the OGA swishes. |
| 2 | Metallic whoosh (0.35 s) | https://freesound.org/people/MissCellany/sounds/240640/ | "Download" (original WAV) | `240640__misscellany__metallic-whoosh.wav` | CC0 | A blade-like swing variant (steel ring in the air). |
| 3 | Combat whooshes (7.2 s, several takes) | https://freesound.org/people/EminYILDIRIM/sounds/535359/ | "Download" (original WAV) | `535359__eminyildirim__combat-whooshes.wav` | CC0 | Cut into 3–4 swing variants. |
| 4 | Grappling hook (0.6 s) | https://freesound.org/people/16bitstudios/sounds/541975/ | "Download" (original WAV) | `541975__16bitstudios__grappling-hook.wav` | CC0 | A real grapple shot to replace the stand-in (sword unsheathe). |
| 5 | Grappling hook / gun extending and retracting (3.6 s) | https://freesound.org/people/randbsoundbites/sounds/792318/ | "Download" (original WAV) | `792318__randbsoundbites__grappling-hook-gun-extending-retracting.wav` | CC0 | The rewind (retract) sound, and a second shot. |

Not needed: **Mixamo** (the astronauts are not skinned meshes: custom procedural rig in
`js/hq/rig.js`, so Mixamo clips cannot drive them).
