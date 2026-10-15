// Anim lab character: one skinned UAL mannequin, one AnimationMixer, layered by per-bone masks.
//
// Layers (all in the same mixer; the mixer sums weights per bone property):
//  - every clip is split in two actions, "#lo" (pelvis + legs) and "#up" (spine and above),
//    built by filtering the clip's tracks on bone names (LabU.maskClip);
//  - locomotion (idle / walk / jog / sprint) is a 1D blend on speed, both halves share one
//    normalised phase (feet stay in sync across walk / jog / sprint);
//  - full-body one-shots (jump, land, roll, slide) fade in/out with the mixer's own fades and
//    push the locomotion weights down by their effective weight;
//  - the weapon layer (rifle carry, aim up/neutral/down) replaces only the "#up" half;
//  - recoil is an additive clip (AnimationUtils.makeClipAdditive) on top of everything;
//  - after mixer.update: strafe hip twist (pelvis yaw + spine counter-yaw), left-hand IK to a
//    support point on the rifle, lean (turn roll / accel pitch) and the double-jump flip on parent groups.
// Why masks for the aim and not additive: the aim / carry poses are absolute (the arms must end
// on the weapon whatever the legs do), an additive aim would add the run's arm swing on top. The
// additive mode is kept for recoil, which is a delta by nature.
// Positions are driven by code (in-place clips), like the game's Player.
const LabChar = (() => {
  const U = LabU;
  const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const CLIP = {
    idle: 'Idle_Loop',
    walk: 'Walk_Loop',
    jog: 'Jog_Fwd_Loop',
    sprint: 'Sprint_Loop',
    jumpStart: 'Jump_Start',
    jumpLoop: 'Jump_Loop',
    jumpLand: 'Jump_Land',
    njStart: 'NinjaJump_Start',
    njLoop: 'NinjaJump_Idle_Loop',
    njLand: 'NinjaJump_Land',
    roll: 'Roll',
    slideStart: 'Slide_Start',
    slideLoop: 'Slide_Loop',
    slideExit: 'Slide_Exit',
    gunIdle: 'Pistol_Idle_Loop',
    aimN: 'Pistol_Aim_Neutral',
    aimU: 'Pistol_Aim_Up',
    aimD: 'Pistol_Aim_Down',
    shoot: 'Pistol_Shoot',
  };
  const LOCO = ['walk', 'jog', 'sprint'];
  // gameplay numbers copied from js/game/player.js (top speeds, jump, gravity)
  const SPEED = { walk: 1.0, run: 5.2, sprint: 8.6, aim: 3.4 };
  const GRAV = 26;
  const JUMP_V = 9.2;
  const DJUMP_V = 7.8;

  // ground speed and foot phase of an in-place cycle, measured from the skeleton itself:
  // the planted foot slides backwards at exactly the speed the body must move forwards
  const measure = (model, bones, clip) => {
    const mixer = new THREE.AnimationMixer(model);
    const a = mixer.clipAction(clip);
    a.play();
    const N = 64;
    const dt = clip.duration / N;
    const pl = [];
    const pr = [];
    const ph = [];
    for (let i = 0; i <= N; i++) {
      mixer.setTime(i * dt);
      model.updateMatrixWorld(true);
      pl.push(bones.foot_l.getWorldPosition(V3()));
      pr.push(bones.foot_r.getWorldPosition(V3()));
      ph.push(bones.pelvis.getWorldPosition(V3()));
    }
    let minY = Infinity;
    for (const p of pl.concat(pr)) minY = Math.min(minY, p.y);
    // mid-stance: the planted foot passes under the pelvis (front to back) while low; its
    // backwards speed there is the ground speed
    const speeds = [];
    let fwdMax = -Infinity;
    let fwdT = 0;
    for (let i = 1; i < N; i++) {
      for (const P of [pl, pr]) {
        const a = P[i].z - ph[i].z;
        const b = P[i + 1].z - ph[i + 1].z;
        if (Math.sign(a) !== Math.sign(b) && P[i].y < minY + 0.06)
          speeds.push(Math.abs(P[i + 1].z - P[i - 1].z) / (2 * dt));
      }
      if (pl[i].z > fwdMax) {
        fwdMax = pl[i].z;
        fwdT = i / N;
      }
    }
    mixer.stopAllAction();
    mixer.uncacheRoot(model);
    const speed = speeds.length ? speeds.reduce((x, y) => x + y, 0) / speeds.length : 1;
    return { speed, offset: fwdT, samples: speeds.length };
  };

  const create = (gltf, opts = {}) => {
    const C = {};
    const model = gltf.scene;
    let skinned = null;
    model.traverse((o) => {
      if (o.isSkinnedMesh) {
        skinned = skinned || o;
        o.castShadow = true;
        o.frustumCulled = false; // skinned bounds are the bind pose: a roll would get culled
      }
    });
    const bones = {};
    for (const b of skinned.skeleton.bones) bones[b.name] = b;
    C.model = model;
    C.skinned = skinned;
    C.bones = bones;
    C.boneCount = skinned.skeleton.bones.length;
    model.traverse((o) => {
      if (o.isMesh && o.material) {
        // the mannequin's two flat materials, tinted like the game's dame / valet suits
        const m = o.material;
        if (m.name && /main|body|mannequin/i.test(m.name)) m.color.set(opts.tint || '#86c79a');
        m.roughness = 0.6;
      }
    });

    // groups: root (position, yaw) > lean (pitch/roll at the feet) > flip (around the hips) > model
    const root = new THREE.Group();
    const lean = new THREE.Group();
    const flip = new THREE.Group();
    lean.rotation.order = 'YXZ';
    flip.position.y = 0.95;
    model.position.y = -0.95;
    root.add(lean);
    lean.add(flip);
    flip.add(model);
    C.root = root;

    const clips = {};
    for (const c of gltf.animations) clips[c.name] = U.inPlace(c, 'pelvis');
    C.clips = clips;

    const cal = {};
    for (const k of LOCO) cal[k] = measure(model, bones, clips[CLIP[k]]);
    C.cal = cal;

    const mixer = new THREE.AnimationMixer(model);
    C.mixer = mixer;
    const slots = {};
    const slot = (key, once) => {
      const clip = clips[CLIP[key]];
      const lo = mixer.clipAction(U.maskClip(clip, U.lowerMask, '#lo'));
      const up = mixer.clipAction(U.maskClip(clip, U.upperMask, '#up'));
      for (const a of [lo, up]) {
        if (once) {
          a.setLoop(THREE.LoopOnce, 1);
          a.clampWhenFinished = true;
        }
      }
      const s = { key, lo, up, dur: clip.duration, once, w: 0 };
      // fades are applied to both halves so they stay identical
      s.play = (fade, t0 = 0, ts = 1) => {
        for (const a of [lo, up]) {
          a.reset();
          a.time = t0;
          a.setEffectiveTimeScale(ts);
          a.weight = 1;
          a.fadeIn(fade).play();
        }
      };
      s.fadeOut = (fade) => {
        for (const a of [lo, up]) a.fadeOut(fade);
      };
      s.cross = (to, fade, t0 = 0, ts = 1) => {
        for (const [a, b] of [
          [lo, to.lo],
          [up, to.up],
        ]) {
          b.reset();
          b.time = t0;
          b.setEffectiveTimeScale(ts);
          b.weight = 1;
          b.play();
          a.crossFadeTo(b, fade, false);
        }
      };
      s.time = () => lo.time;
      // an action never played still reports weight 1: only scheduled ones count
      s.eff = () => (lo.isScheduled() ? lo.getEffectiveWeight() : 0);
      s.running = () => lo.isRunning() || lo.getEffectiveWeight() > 0.001;
      slots[key] = s;
      return s;
    };
    ['idle', ...LOCO].forEach((k) => slot(k, false));
    ['jumpStart', 'jumpLand', 'njStart', 'njLand', 'roll', 'slideStart', 'slideExit'].forEach((k) => slot(k, true));
    ['jumpLoop', 'njLoop', 'slideLoop'].forEach((k) => slot(k, false));
    // locomotion halves always play; their weights are written every frame
    for (const k of ['idle', ...LOCO]) {
      slots[k].lo.play();
      slots[k].up.play();
    }
    C.slots = slots;
    const ONESHOT = ['jumpStart', 'jumpLoop', 'jumpLand', 'njStart', 'njLoop', 'njLand', 'roll', 'slideStart', 'slideLoop', 'slideExit'];
    // one-shots during which the weapon layer is dropped (whole body busy)
    const NO_WEAPON = ['roll', 'slideStart', 'slideLoop', 'slideExit'];

    // weapon layer: upper-body only
    const upAction = (name) => mixer.clipAction(U.maskClip(clips[name], U.upperMask, '#up'));
    const wpn = {
      carry: upAction(CLIP.gunIdle),
      aimN: upAction(CLIP.aimN),
      aimU: upAction(CLIP.aimU),
      aimD: upAction(CLIP.aimD),
    };
    for (const a of Object.values(wpn)) a.play();
    C.wpn = wpn;
    // recoil: additive (delta from the clip's first frame), upper body only
    const shootClip = THREE.AnimationUtils.makeClipAdditive(U.maskClip(clips[CLIP.shoot], U.upperMask, '#add'), 0);
    const recoil = mixer.clipAction(shootClip);
    recoil.setLoop(THREE.LoopOnce, 1);
    recoil.blendMode = THREE.AdditiveAnimationBlendMode;
    C.recoil = recoil;

    // ---- rifle: AK-47 (or a box) rigidly attached to hand_r, holstered on spine_03 ----
    const handSock = new THREE.Object3D();
    const backSock = new THREE.Object3D();
    bones.hand_r.add(handSock);
    bones.spine_03.add(backSock);
    const gun = new THREE.Group();
    C.gun = gun;
    C.fore = V3(-0.045, -0.03, 0.11); // support-hand point, gun space (+Z = muzzle, +Y = up)
    C.grip = V3(0, -0.045, -0.015);
    C.setGunModel = (obj, fore, grip) => {
      gun.clear();
      gun.add(obj);
      if (fore) C.fore.copy(fore);
      if (grip) C.grip.copy(grip);
      obj.position.copy(C.grip).negate(); // grip at the gun group's origin
    };
    {
      const box = new THREE.Mesh(
        new THREE.BoxGeometry(0.05, 0.09, 0.75),
        new THREE.MeshStandardMaterial({ color: '#222', roughness: 0.5 }),
      );
      box.position.z = 0.3;
      box.castShadow = true;
      C.setGunModel(box, V3(-0.045, -0.03, 0.11), V3(0, 0, 0));
    }
    // socket orientation solved once in the aim pose: muzzle along the body's forward, up = up
    C.solveSockets = (palm = V3(0, 0.085, 0.02), back = V3(0.02, 0.0, -0.2)) => {
      const tmp = new THREE.AnimationMixer(model);
      tmp.clipAction(clips[CLIP.aimN]).play();
      tmp.update(0);
      model.updateMatrixWorld(true);
      const hq = bones.hand_r.getWorldQuaternion(new THREE.Quaternion());
      const mq = model.getWorldQuaternion(new THREE.Quaternion());
      handSock.quaternion.copy(hq.invert().multiply(mq));
      // palm: a few cm from the wrist along the hand bone (bone space)
      handSock.position.copy(palm);
      // back holster, offset in model space from spine_03 (+X = the body's left, +Y up, +Z
      // forward). Sling carry: muzzle up over the left shoulder, stock towards the right hip
      const dir = V3(0.42, 0.88, -0.2).normalize();
      const want = new THREE.Quaternion().setFromUnitVectors(V3(0, 0, 1), dir);
      const centre = back.clone().addScaledVector(dir, -0.15); // gun centre ~15 cm before the grip
      const sp = bones.spine_03.getWorldPosition(V3());
      backSock.position.copy(bones.spine_03.worldToLocal(sp.add(centre.applyQuaternion(mq))));
      const bq = bones.spine_03.getWorldQuaternion(new THREE.Quaternion());
      backSock.quaternion.copy(bq.invert().multiply(mq).multiply(want));
      tmp.stopAllAction();
      tmp.uncacheRoot(model);
    };
    C.solveSockets();
    C.handSock = handSock;
    C.backSock = backSock;
    backSock.add(gun);

    // ---- controller state ----
    const S = {
      pos: V3(),
      vel: V3(),
      yaw: 0,
      yawRate: 0,
      grounded: true,
      state: 'loco',
      label: 'idle',
      phase: 0,
      weapon: 0, // weapon layer weight
      aimK: 0,
      rifle: false,
      aim: false,
      jumps: 0,
      coyote: 0,
      flipT: -1,
      flipDir: 1,
      twist: 0, // strafe hip twist (rad)
      back: false, // walking backwards (aim strafe)
      lean: 0,
      pitch: 0,
      prevSpeed: 0,
      turning: false,
      stateT: 0,
      oneshot: null,
      speedAnim: 0,
      blend: {},
    };
    C.S = S;
    C.SPEED = SPEED;
    // tuning knobs, editable live from window.__lab
    C.T = {
      jumpT0: 0.32, // Jump_Start begins crouched: skip the anticipation, the body already left
      jumpTS: 1.5,
      landTS: 1.35,
      rollTS: 1.25,
      fadeLoco: 0.18,
      ik: true,
      twist: true,
      lean: true,
    };

    const goOneShot = (key, fade, t0 = 0, ts = 1) => {
      const next = slots[key];
      if (S.oneshot && S.oneshot !== next && S.oneshot.running()) S.oneshot.cross(next, fade, t0, ts);
      else next.play(fade, t0, ts);
      S.oneshot = next;
      S.state = key;
      S.stateT = 0;
    };
    const endOneShot = (fade) => {
      if (S.oneshot) S.oneshot.fadeOut(fade);
      S.oneshot = null;
      S.state = 'loco';
      S.stateT = 0;
    };

    C.teleport = (x, y, z, yaw = 0) => {
      S.pos.set(x, y, z);
      S.vel.set(0, 0, 0);
      S.yaw = yaw;
    };

    // in: { mx, mz (world move dir * magnitude), camYaw, camPitch, sprint, walk, jump, dodge, slide, aim, shoot }
    C.update = (dt, inp) => {
      const T = C.T;
      S.stateT += dt;
      S.aim = !!inp.aim;
      const mag = Math.min(1, Math.hypot(inp.mx, inp.mz));
      const busy = S.state === 'roll' || S.state.startsWith('slide');
      const sprint = inp.sprint && !S.aim && mag > 0.1;
      const top = (S.aim ? SPEED.aim : sprint ? SPEED.sprint : inp.walk ? SPEED.walk : SPEED.run) * mag;
      const dx = mag > 0.01 ? inp.mx / mag : 0;
      const dz = mag > 0.01 ? inp.mz / mag : 0;
      const v = S.vel;

      // ---- horizontal motion ----
      if (S.state === 'roll') {
        const k = S.stateT / (slots.roll.dur / T.rollTS);
        const sp = U.lerp(6.5, 1.5, U.clamp(k, 0, 1));
        v.x = Math.sin(S.yaw) * sp;
        v.z = Math.cos(S.yaw) * sp;
      } else if (S.state.startsWith('slide')) {
        const hs = Math.hypot(v.x, v.z);
        const ns = Math.max(0, hs - 4.5 * dt);
        if (hs > 0.01) {
          v.x *= ns / hs;
          v.z *= ns / hs;
        }
      } else if (S.grounded) {
        const k = 1 - Math.exp(-(mag > 0.01 ? 14 : 9) * dt);
        v.x += (dx * top - v.x) * k;
        v.z += (dz * top - v.z) * k;
      } else {
        // air control, capped like the game: steering never adds speed beyond max(before, top)
        const before = Math.hypot(v.x, v.z);
        v.x += dx * 18 * mag * dt;
        v.z += dz * 18 * mag * dt;
        const after = Math.hypot(v.x, v.z);
        const cap = Math.max(before, top);
        if (after > cap) {
          v.x *= cap / after;
          v.z *= cap / after;
        }
        const drag = Math.exp(-(mag > 0.01 ? 0.15 : 0.6) * dt);
        v.x *= drag;
        v.z *= drag;
      }
      v.y = Math.max(-42, v.y - GRAV * dt);

      // ---- jump / dodge / slide inputs ----
      if (S.grounded) {
        S.coyote = 0.12;
        S.jumps = 0;
      } else S.coyote -= dt;
      const hs0 = Math.hypot(v.x, v.z);
      if (inp.jump && !busy) {
        if (S.coyote > 0) {
          v.y = JUMP_V;
          S.coyote = 0;
          S.jumps = 1;
          S.grounded = false;
          const ninja = hs0 > 6.5; // sprint jump: the parkour take-off from UAL2
          goOneShot(ninja ? 'njStart' : 'jumpStart', 0.08, ninja ? 0.25 : T.jumpT0, T.jumpTS);
        } else if (S.jumps < 2) {
          v.y = DJUMP_V;
          S.jumps = 2;
          S.flipT = 0;
          S.flipDir = inp.back ? -1 : 1;
          if (!S.state.startsWith('jumpLoop') && !S.state.startsWith('njLoop')) goOneShot('jumpLoop', 0.15);
        }
      }
      if (inp.dodge && S.grounded && !busy) {
        if (mag > 0.1) S.yaw = Math.atan2(dx, dz);
        goOneShot('roll', 0.1, 0.05, T.rollTS);
      }
      if (inp.slide && S.grounded && !busy && hs0 > 6) goOneShot('slideStart', 0.12, 0, 1.2);

      // ---- integrate + collide ----
      const prevY = S.pos.y;
      const px = S.pos.x;
      const pz = S.pos.z;
      S.pos.addScaledVector(v, dt);
      LabWorld.pushOut(S.pos, 0.35);
      // walls eat the velocity (the blend then follows the real speed, no running on the spot)
      if (dt > 0) {
        const rx = (S.pos.x - px) / dt;
        const rz = (S.pos.z - pz) / dt;
        if (rx * rx + rz * rz < v.x * v.x + v.z * v.z - 1e-6) {
          v.x = rx;
          v.z = rz;
        }
      }
      const g = LabWorld.groundAt(S.pos, 0.35);
      const wasG = S.grounded;
      if (S.pos.y <= g + 1e-4 && v.y <= 0) {
        S.pos.y = g;
        S.landVy = wasG ? 0 : v.y;
        v.y = 0;
        S.grounded = true;
      } else if (S.grounded && S.pos.y - g < 0.3 && v.y <= 0 && prevY - g < 0.5) {
        S.pos.y = g; // step down
        v.y = 0;
      } else S.grounded = false;
      const hs = Math.hypot(v.x, v.z);

      // ---- facing ----
      const prevYaw = S.yaw;
      if (S.aim || (S.rifle && hs < 0.3 && S.turning)) S.yaw = U.angleDamp(S.yaw, inp.camYaw, S.aim ? 14 : 7, dt);
      else if (hs > 0.5 && !busy) S.yaw = U.angleDamp(S.yaw, Math.atan2(v.x, v.z), 12, dt);
      // turn in place: carrying / aiming and the camera swung far: step round to face it
      if (S.rifle && !S.aim && hs < 0.3 && S.grounded) {
        const d = Math.abs(U.wrap(inp.camYaw - S.yaw));
        if (d > 1.0) S.turning = true;
        if (d < 0.08) S.turning = false;
      } else if (hs >= 0.3) S.turning = false;
      S.yawRate = U.damp(S.yawRate, U.wrap(S.yaw - prevYaw) / Math.max(dt, 1e-4), 10, dt);

      // ---- state machine (full-body one-shots) ----
      const st = S.state;
      const os = S.oneshot;
      if (st === 'jumpStart' || st === 'njStart') {
        if (S.grounded && S.stateT > 0.1) goOneShot(st === 'njStart' ? 'njLand' : 'jumpLand', 0.08, 0.45, T.landTS);
        else if (os.time() > os.dur - 0.12) goOneShot(st === 'njStart' ? 'njLoop' : 'jumpLoop', 0.2);
      } else if (st === 'jumpLoop' || st === 'njLoop') {
        if (S.grounded) {
          const hard = (S.landVy || 0) < -9;
          goOneShot(st === 'njLoop' ? 'njLand' : 'jumpLand', 0.06, hard ? 0.18 : 0.4, T.landTS);
        }
      } else if (st === 'jumpLand' || st === 'njLand') {
        // landing gives way to locomotion: early if the stick is pushed, else when it is done
        if (!S.grounded) goOneShot('jumpLoop', 0.15);
        else if ((mag > 0.1 && S.stateT > 0.12) || os.time() > os.dur - 0.25) endOneShot(mag > 0.1 ? 0.15 : 0.3);
      } else if (st === 'roll') {
        if (os.time() > os.dur - 0.3) endOneShot(0.25);
      } else if (st === 'slideStart') {
        if (os.time() > os.dur - 0.08) goOneShot('slideLoop', 0.12);
      } else if (st === 'slideLoop') {
        if (hs < 3 || S.stateT > 1.2) goOneShot('slideExit', 0.12, 0, 1.3);
      } else if (st === 'slideExit') {
        if (os.time() > os.dur - 0.15) endOneShot(0.2);
      } else if (st === 'loco' && !S.grounded && S.pos.y < prevY - 0.02 && S.coyote < 0.05) {
        goOneShot('jumpLoop', 0.25); // walked off a ledge
      }
      if (S.grounded) S.flipT = -1;

      // ---- weights ----
      // one-shot weight (from the mixer's own fades, one frame behind: fine)
      let O = 0;
      let Onw = 0;
      for (const k of ONESHOT) {
        const e = slots[k].eff();
        O += e;
        if (NO_WEAPON.includes(k)) Onw += e;
      }
      O = Math.min(1, O);
      Onw = Math.min(1, Onw);
      S.O = O;

      // locomotion 1D blend on speed, thresholds = measured ground speed of each clip
      // aim strafe: legs follow the move direction (hip twist), backwards plays the cycle reversed
      let sp = S.grounded ? hs : 0;
      let twistT = 0;
      let back = false;
      if (S.aim && hs > 0.3) {
        const rel = U.wrap(Math.atan2(v.x, v.z) - S.yaw);
        if (Math.abs(rel) <= 1.75) twistT = U.clamp(rel, -1.35, 1.35);
        else {
          back = true;
          twistT = U.clamp(U.wrap(rel - Math.PI), -1.35, 1.35);
        }
      }
      S.twist = U.damp(S.twist, T.twist ? twistT : 0, 10, dt);
      S.back = back;
      if (S.turning) sp = Math.max(sp, cal.walk.speed * 0.55);
      S.speedAnim = U.damp(S.speedAnim, sp, 12, dt);
      const s = S.speedAnim;
      const pts = [
        ['idle', 0],
        ['walk', cal.walk.speed],
        ['jog', cal.jog.speed],
        ['sprint', cal.sprint.speed],
      ];
      const w = { idle: 0, walk: 0, jog: 0, sprint: 0 };
      if (s <= 0) w.idle = 1;
      else if (s >= pts[3][1]) w.sprint = 1;
      else
        for (let i = 0; i < 3; i++) {
          const [a, sa] = pts[i];
          const [b, sb] = pts[i + 1];
          if (s >= sa && s <= sb) {
            const t = (s - sa) / (sb - sa);
            w[a] = 1 - t;
            w[b] = t;
            break;
          }
        }
      // playback rate: the cycle is stretched so the planted foot matches the ground speed
      const mv = w.walk + w.jog + w.sprint;
      let cycle = 1;
      let natural = 0;
      if (mv > 0) {
        let dur = 0;
        for (const k of LOCO) {
          dur += (w[k] / mv) * slots[k].dur;
          natural += (w[k] / mv) * cal[k].speed;
        }
        const rate = U.clamp(s / Math.max(natural, 0.01), mv < 1 ? 1 : 0.6, 1.6);
        cycle = dur / rate;
        S.phase = (S.phase + (back ? -dt : dt) / cycle + 1) % 1;
      }
      for (const k of LOCO) {
        const sl = slots[k];
        const t = ((S.phase + cal[k].offset) % 1) * sl.dur;
        const ts = (back ? -1 : 1) * (sl.dur / cycle);
        for (const a of [sl.lo, sl.up]) {
          a.time = t;
          a.setEffectiveTimeScale(ts);
        }
      }
      S.blend = w;

      // weapon layer
      const wantWeapon = (S.rifle || S.aim) ? 1 : 0;
      S.weapon = U.damp(S.weapon, wantWeapon, 10, dt);
      S.aimK = U.damp(S.aimK, S.aim ? 1 : 0, 12, dt);
      const Ueff = S.weapon * (1 - Onw);
      S.Ueff = Ueff;
      const pitch = inp.camPitch || 0; // + = camera above = looking down
      const dn = U.clamp((pitch - 0.05) / 0.7, 0, 1);
      const upk = U.clamp((-pitch + 0.05) / 0.6, 0, 1);
      const aimW = { aimN: 1 - dn - upk, aimD: dn, aimU: upk };
      wpn.carry.weight = Ueff * (1 - S.aimK);
      for (const k of ['aimN', 'aimD', 'aimU']) wpn[k].weight = Ueff * S.aimK * aimW[k];

      for (const k of ['idle', ...LOCO]) {
        const sl = slots[k];
        sl.lo.weight = w[k] * (1 - O);
        sl.up.weight = w[k] * (1 - O) * (1 - Ueff);
        sl.w = w[k] * (1 - O);
      }
      for (const k of ONESHOT) slots[k].up.weight = 1 - Ueff;

      if (inp.shoot && S.aimK > 0.5) {
        recoil.reset().play();
        recoil.weight = 1;
      }

      // ---- labels for the HUD ----
      if (S.state !== 'loco') S.label = S.state;
      else if (S.turning) S.label = 'turn in place';
      else if (hs > 1 && Math.abs(S.yawRate) > 2.5) S.label = 'turn (lean)';
      else if (hs < 0.15) S.label = S.weapon > 0.5 ? (S.aim ? 'aim' : 'rifle idle') : 'idle';
      else if (mag < 0.05) S.label = 'stop';
      else if (S.aim) S.label = back ? 'aim strafe (back)' : Math.abs(twistT) > 0.5 ? 'aim strafe' : 'aim walk';
      else S.label = (S.weapon > 0.5 ? 'rifle ' : '') + (hs > 7 ? 'sprint' : hs > 3.2 ? 'run' : 'walk');

      // ---- mixer, then post-mixer edits ----
      mixer.update(dt);

      root.position.copy(S.pos);
      root.rotation.y = S.yaw;
      // lean into turns (roll) and against acceleration (pitch): the stop settles the body back
      const acc = (hs - S.prevSpeed) / Math.max(dt, 1e-4);
      S.prevSpeed = hs;
      const leanT = T.lean && S.grounded && S.state === 'loco' ? U.clamp(-S.yawRate * hs * 0.018, -0.3, 0.3) : 0;
      const pitchT = T.lean && S.grounded && S.state === 'loco' ? U.clamp(acc * 0.012, -0.12, 0.1) : 0;
      S.lean = U.damp(S.lean, leanT, 8, dt);
      S.pitch = U.damp(S.pitch, pitchT, 6, dt);
      lean.rotation.z = S.lean;
      lean.rotation.x = S.pitch;
      // double-jump flip (procedural, like the game's salto): there is no flip clip in UAL Standard
      if (S.flipT >= 0) {
        S.flipT += dt;
        const k = U.clamp(S.flipT / 0.55, 0, 1);
        const e = k < 0.5 ? 4 * k * k * k : 1 - Math.pow(-2 * k + 2, 3) / 2;
        flip.rotation.x = -S.flipDir * Math.PI * 2 * e;
        if (k >= 1) S.flipT = -1;
      } else flip.rotation.x = 0;

      root.updateMatrixWorld(true);
      // hip twist for strafing: legs turn to the move direction, the chest stays on the aim
      if (Math.abs(S.twist) > 0.002) {
        U.yawWorld(bones.pelvis, S.twist);
        for (const b of ['spine_01', 'spine_02', 'spine_03']) U.yawWorld(bones[b], -S.twist / 3);
      }
      // rifle in hand when the weapon layer is up, on the back otherwise
      const inHand = S.weapon > 0.5 && Onw < 0.5;
      const sock = inHand ? handSock : backSock;
      if (gun.parent !== sock) sock.add(gun);
      // left hand on the foregrip (two-bone IK), weighted by the weapon layer
      if (T.ik && inHand) {
        gun.updateMatrixWorld(true);
        const target = gun.localToWorld(C.fore.clone());
        U.ik2(bones.upperarm_l, bones.lowerarm_l, bones.hand_l, target, V3(0, -1, 0), U.clamp(Ueff * 1.4 - 0.3, 0, 1));
      }
    };

    C.debug = () => {
      const r = [];
      const ew = (a) => (a.isScheduled() ? a.getEffectiveWeight() : 0);
      for (const [k, sl] of Object.entries(slots)) {
        const lo = ew(sl.lo);
        const up = ew(sl.up);
        if (lo > 0.005 || up > 0.005) r.push([CLIP[k], lo, up]);
      }
      for (const [k, a] of Object.entries(wpn)) {
        const e = ew(a);
        if (e > 0.005) r.push([CLIP[k === 'carry' ? 'gunIdle' : k], 0, e]);
      }
      if (recoil.isRunning()) r.push(['Pistol_Shoot (additive)', 0, ew(recoil)]);
      return r;
    };
    return C;
  };

  return { create, CLIP, SPEED };
})();
