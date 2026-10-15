# assets/anim (anim lab only)

Models and clips used by `borderline/animlab.html` (skeletal-animation prototype). Nothing in the
game loads these files yet. All three files are CC0. Total: 3.5 MB.

| File | Size | Source | Licence |
| --- | --- | --- | --- |
| `ual_mannequin.glb` | 1.59 MB | Quaternius, Universal Animation Library (UAL1) Standard + UAL2 Standard | CC0 1.0 |
| `ual_mannequin_f.glb` | 1.44 MB | Quaternius, UAL2 Standard, `Female Mannequin/Unreal-Godot/Mannequin_F.glb` (unchanged) | CC0 1.0 |
| `kaykit_knight.glb` | 0.46 MB | Kay Lousberg, KayKit Character Pack: Adventurers 1.0, `Characters/gltf/Knight.glb` | CC0 1.0 |

## Sources

- Quaternius, Universal Animation Library: https://quaternius.com/packs/universalanimationlibrary.html
  and https://quaternius.com/packs/universalanimationlibrary2.html (the free "Standard" edition
  is distributed through https://quaternius.itch.io/universal-animation-library).
  The files were taken from a public GitHub redistribution of the unmodified Standard archives
  (`NafisRayan/Animate-Rigged-Humanoid-No-Blender`, commit 5821923af517, folders
  `Universal Animation Library[Standard]` and `Universal Animation Library 2[Standard]`), which
  CC0 allows. The `License.txt` shipped in both archives reads:
  "License: CC0 1.0 Universal (CC0 1.0) Public Domain Dedication
  https://creativecommons.org/publicdomain/zero/1.0/ ... Models by @Quaternius".
  SHA-256 of the source files, to compare with a copy downloaded from itch.io:
  - `UAL1_Standard.glb` 69591853d817488edaa8fd9bf8fc1d821eaeaf789f8627b3cd23b41c4ed67997
  - `UAL2_Standard.glb` 8cee20ab1bc55130092447e810e26df22dd2803eccc54f52137a7d54d7ab88a8
  - `Mannequin_F.glb` 2ee6cc3fe888d9b144afa8cc4b2ab7bfc5d13a0d5b7548df777f61f64ad65fa6
- KayKit Adventurers 1.0: https://github.com/KayKit-Game-Assets/KayKit-Character-Pack-Adventures-1.0
  (official repository, commit 672074b73ba2). `LICENSE.txt`: "License: (Creative Commons Zero,
  CC0) http://creativecommons.org/publicdomain/zero/1.0/ This content is free to use in personal,
  educational and commercial projects." Credit (optional): Kay Lousberg, www.kaylousberg.com.
  SHA-256 of `Knight.glb`: 60428e3abc09ba83e595d256e3af8c5c976b46cdae599f0802fc82b4a3445168

Credit line (optional for CC0): "Animations and mannequins by Quaternius (CC0); KayKit Knight by
Kay Lousberg (CC0)."

## What was changed

A small GLB rewriter (no dependencies, not in the repo) produced the files:

- `ual_mannequin.glb` = UAL1 Standard mesh + skin (in-place version, not `_RM`), keeping 16 UAL1
  clips and merging 8 UAL2 clips by bone name. Channels that never leave the bind value are
  dropped (all scale tracks, every bone translation except `pelvis`), which takes 43 + 43 clips at
  7.6 + 8.1 MB down to 24 clips at 1.6 MB with no visible change.
- `kaykit_knight.glb` = Knight with the weapon / shield props removed and 8 of its 76 clips kept
  (native reference for the retarget bench).
- `ual_mannequin_f.glb` = unchanged.

Clips in `ual_mannequin.glb`:
UAL1 `Idle_Loop`, `Walk_Loop`, `Jog_Fwd_Loop`, `Sprint_Loop`, `Jump_Start`, `Jump_Loop`,
`Jump_Land`, `Roll`, `Pistol_Idle_Loop`, `Pistol_Aim_Neutral`, `Pistol_Aim_Up`, `Pistol_Aim_Down`,
`Pistol_Shoot`, `Crouch_Idle_Loop`, `Crouch_Fwd_Loop`, `Hit_Chest`;
UAL2 `NinjaJump_Start`, `NinjaJump_Idle_Loop`, `NinjaJump_Land`, `Slide_Start`, `Slide_Loop`,
`Slide_Exit`, `ClimbUp_1m`, `Hit_Knockback`.

The free Standard editions contain 43 clips each. There are no strafe / backward / turn-in-place /
rifle / backflip clips in them (those are in the paid "Pro" / "Source" editions); the lab builds
strafe, turn in place, rifle carry and the flip from the clips above plus code.

## UAL skeleton (65 bones, both mannequins)

```
root
  pelvis
    spine_01 > spine_02 > spine_03
      neck_01 > Head
      clavicle_l > upperarm_l > lowerarm_l > hand_l
        thumb_01..03_l (+ thumb_04_leaf_l), index_01..03_l, middle_01..03_l,
        ring_01..03_l, pinky_01..03_l (each + *_04_leaf_l)
      clavicle_r > upperarm_r > lowerarm_r > hand_r (same fingers, _r)
    thigh_l > calf_l > foot_l > ball_l > ball_leaf_l
    thigh_r > calf_r > foot_r > ball_r > ball_leaf_r
```

Unreal Mannequin naming (Blender export, Y along each bone, bind pose = the pose of `A_TPose`).
A character rigged on this skeleton with these exact names plays every UAL clip with no
retargeting (see `ual_mannequin_f.glb` in the lab).
