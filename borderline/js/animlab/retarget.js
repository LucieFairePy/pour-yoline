// Retarget bench: does a UAL clip play on other skeletons?
//  1. KayKit Knight + THREE.SkeletonUtils.retargetClip (r128, as shipped)
//  2. KayKit Knight + a world-space delta retarget written here (rest-to-rest rotation deltas,
//     hip translation scaled by leg length)
//  3. KayKit Knight playing its own clip (reference for what it should look like)
//  4. UAL female mannequin playing the UAL clip directly: same bone names, no retarget at all
//  5. UAL female + r128 retargetClip (same bone names: the easiest possible case)
// Result in the lab: (1) and (5) are broken (r128's retarget multiplies the source bone's world
// rotation by the target's bind matrix, i.e. it expects a source whose rest bones have identity
// world rotations, as BVH has; glTF rigs from Blender do not, and the hip gets the source's world
// height); (2) is usable; (4) is perfect. Hence: rig the astronaut on the UAL skeleton.
const LabRetarget = (() => {
  const V3 = (x = 0, y = 0, z = 0) => new THREE.Vector3(x, y, z);
  const strip = (n) => n.toLowerCase().replace(/[^a-z0-9]/g, '');
  // KayKit Adventurers rig -> UAL (Unreal-like mannequin) rig. Several KayKit bones may follow
  // the same UAL bone (wrist + hand + handslot -> hand_*), unmapped bones keep their rest pose.
  const MAP = {
    hips: 'pelvis',
    spine: 'spine_01',
    chest: 'spine_03',
    head: 'Head',
    upperarml: 'upperarm_l',
    lowerarml: 'lowerarm_l',
    wristl: 'hand_l',
    handl: 'hand_l',
    handslotl: 'hand_l',
    upperarmr: 'upperarm_r',
    lowerarmr: 'lowerarm_r',
    wristr: 'hand_r',
    handr: 'hand_r',
    handslotr: 'hand_r',
    upperlegl: 'thigh_l',
    lowerlegl: 'calf_l',
    footl: 'foot_l',
    toesl: 'ball_l',
    upperlegr: 'thigh_r',
    lowerlegr: 'calf_r',
    footr: 'foot_r',
    toesr: 'ball_r',
  };
  const skinnedOf = (root) => {
    let s = null;
    root.traverse((o) => {
      if (o.isSkinnedMesh && !s) s = o;
    });
    return s;
  };
  // { targetBoneName: sourceBoneName } with the target's real (sanitised) names
  const namesFor = (tgtSkinned) => {
    const names = {};
    for (const b of tgtSkinned.skeleton.bones) if (MAP[strip(b.name)]) names[b.name] = MAP[strip(b.name)];
    return names;
  };

  // (1) r128 SkeletonUtils.retargetClip
  const viaSkeletonUtils = (tgtRoot, srcRoot, clip) => {
    const tgt = skinnedOf(tgtRoot);
    const src = skinnedOf(srcRoot);
    const names = namesFor(tgt);
    const t0 = performance.now();
    const out = THREE.SkeletonUtils.retargetClip(tgt, src, clip, { names, hip: 'pelvis', fps: 30 });
    tgt.skeleton.pose();
    return { clip: out, ms: performance.now() - t0, names };
  };

  // (2) world-space delta: Qtgt_world(t) = Qsrc_world(t) * Qsrc_rest_world^-1 * Qtgt_rest_world
  // (both rigs in their bind pose = reference pose; both models face +Z with Y up)
  const viaDelta = (tgtRoot, srcRoot, clip, fps = 30) => {
    const t0 = performance.now();
    const tgt = skinnedOf(tgtRoot);
    const src = skinnedOf(srcRoot);
    const names = namesFor(tgt);
    const sb = {};
    for (const b of src.skeleton.bones) sb[b.name] = b;
    const tb = tgt.skeleton.bones;
    src.skeleton.pose();
    tgt.skeleton.pose();
    srcRoot.updateMatrixWorld(true);
    tgtRoot.updateMatrixWorld(true);
    const wq = (o) => o.getWorldQuaternion(new THREE.Quaternion());
    const srcRest = {};
    for (const b of src.skeleton.bones) srcRest[b.name] = wq(b).invert();
    const tgtRest = tb.map((b) => wq(b));
    const tgtRestLocal = tb.map((b) => b.quaternion.clone());
    const hipT = tb.find((b) => names[b.name] === 'pelvis');
    const hipS = sb.pelvis;
    const hipRestT = hipT.getWorldPosition(V3());
    const hipRestS = hipS.getWorldPosition(V3());
    // leg length ratio (hip height above the feet) scales the pelvis travel
    const ratio = hipRestT.y / Math.max(hipRestS.y, 1e-3);

    const mixer = new THREE.AnimationMixer(srcRoot);
    mixer.clipAction(clip).play();
    const n = Math.max(2, Math.round(clip.duration * fps) + 1);
    const times = new Float32Array(n);
    const qv = tb.map(() => new Float32Array(n * 4));
    const pv = new Float32Array(n * 3);
    const q = new THREE.Quaternion();
    const pq = new THREE.Quaternion();
    for (let i = 0; i < n; i++) {
      const t = Math.min(clip.duration, i / fps);
      times[i] = t;
      mixer.setTime(t);
      srcRoot.updateMatrixWorld(true);
      tb.forEach((b, j) => b.quaternion.copy(tgtRestLocal[j]));
      tgtRoot.updateMatrixWorld(true);
      // parents come before children in a glTF skin's joint list (checked on both rigs)
      tb.forEach((b, j) => {
        const sn = names[b.name];
        if (sn) {
          q.copy(wq(sb[sn])).multiply(srcRest[sn]).multiply(tgtRest[j]);
          b.parent.getWorldQuaternion(pq);
          b.quaternion.copy(pq.invert().multiply(q));
          b.updateMatrixWorld(true);
        }
        b.quaternion.toArray(qv[j], i * 4);
      });
      const d = hipS.getWorldPosition(V3()).sub(hipRestS).multiplyScalar(ratio);
      const p = hipT.parent.worldToLocal(hipRestT.clone().add(d));
      p.toArray(pv, i * 3);
    }
    mixer.stopAllAction();
    mixer.uncacheRoot(srcRoot);
    tgt.skeleton.pose();
    src.skeleton.pose();
    const tracks = [];
    tb.forEach((b, j) => {
      if (names[b.name]) tracks.push(new THREE.QuaternionKeyframeTrack(b.name + '.quaternion', times, qv[j]));
    });
    tracks.push(new THREE.VectorKeyframeTrack(hipT.name + '.position', times, pv));
    return { clip: new THREE.AnimationClip(clip.name + '_delta', clip.duration, tracks), ms: performance.now() - t0, ratio };
  };

  const label = (text) => {
    const c = document.createElement('canvas');
    c.width = 512;
    c.height = 96;
    const g = c.getContext('2d');
    g.fillStyle = 'rgba(10,8,18,0.75)';
    g.fillRect(0, 0, 512, 96);
    g.fillStyle = '#f2ecff';
    g.font = '600 30px system-ui, sans-serif';
    g.textAlign = 'center';
    const lines = text.split('\n');
    lines.forEach((l, i) => g.fillText(l, 256, 40 + i * 34 - (lines.length - 1) * 12));
    const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: new THREE.CanvasTexture(c), depthWrite: false }));
    s.scale.set(1.7, 0.32, 1);
    return s;
  };

  // build the bench at `origin` (row along +X); returns { update(dt), setClip(name), info }
  const build = (scene, origin, ualGltf, knightGltf, femGltf, clipNames) => {
    const SU = THREE.SkeletonUtils;
    const src = SU.clone(ualGltf.scene); // retarget source, never added to the scene
    src.position.set(0, 0, 0); // the lab offsets the player's model; the source must sit at the origin
    src.rotation.set(0, 0, 0);
    src.updateMatrixWorld(true);
    const R = { mixers: [], info: {}, actors: [] };
    const group = new THREE.Group();
    group.position.copy(origin);
    scene.add(group);
    R.group = group;
    const ualClips = {};
    for (const c of ualGltf.animations) ualClips[c.name] = c;
    const knightClips = {};
    for (const c of knightGltf.animations) knightClips[c.name] = c;
    const NATIVE = { Walk_Loop: 'Walking_A', Jog_Fwd_Loop: 'Running_A', Idle_Loop: 'Idle', Roll: 'Dodge_Forward', Sprint_Loop: 'Running_A' };

    // mixerRoot: SkeletonUtils.retargetClip names its tracks ".bones[name]", which only binds
    // on a SkinnedMesh root
    const actor = (obj, x, text, mixerRoot = obj) => {
      obj.position.set(x, 0, 0);
      obj.traverse((o) => {
        if (o.isMesh) o.castShadow = true;
      });
      group.add(obj);
      const l = label(text);
      l.position.set(x, 0.12, 0.85); // on the floor in front: never hidden by a head
      group.add(l);
      const m = new THREE.AnimationMixer(mixerRoot);
      R.mixers.push(m);
      return { obj, mixer: m, action: null };
    };
    const kA = SU.clone(knightGltf.scene);
    const kB = SU.clone(knightGltf.scene);
    const kC = SU.clone(knightGltf.scene);
    // retarget targets must sit at the origin with an identity transform while baking
    const bakeTarget = SU.clone(knightGltf.scene);
    const bakeFem = SU.clone(femGltf.scene);
    const fem = femGltf.scene;
    const fem2 = SU.clone(femGltf.scene);
    const A = actor(kA, 0, 'KayKit + r128\nSkeletonUtils.retargetClip', skinnedOf(kA));
    const B = actor(kB, 2, 'KayKit + delta retarget\n(lab, world-space)');
    const Cn = actor(kC, 4, 'KayKit native clip\n(reference)');
    const F = actor(fem, 6, 'UAL female mannequin\nsame skeleton, no retarget');
    // the easiest case for r128: same bone names, only the proportions differ
    const F2 = actor(fem2, 8, 'UAL female + r128\nretargetClip (same names)', skinnedOf(fem2));
    R.actors = [A, B, Cn, F, F2];

    const cache = {};
    R.setClip = (name) => {
      const clip = ualClips[name];
      if (!clip) return 'no clip ' + name;
      if (!cache[name]) {
        const r1 = viaSkeletonUtils(bakeTarget, src, clip);
        const r2 = viaDelta(bakeTarget, src, clip);
        const t = performance.now();
        const fs = skinnedOf(bakeFem);
        const r3 = THREE.SkeletonUtils.retargetClip(fs, skinnedOf(src), clip, { hip: 'pelvis', fps: 30 });
        fs.skeleton.pose();
        cache[name] = { r1, r2, r3, r3ms: performance.now() - t };
      }
      const { r1, r2, r3 } = cache[name];
      const play = (act, c) => {
        act.mixer.stopAllAction();
        act.action = act.mixer.clipAction(c);
        act.action.play();
      };
      play(A, r1.clip);
      play(B, r2.clip);
      play(Cn, knightClips[NATIVE[name]] || knightClips.Idle);
      play(F, clip);
      play(F2, r3);
      R.info = {
        clip: name,
        skeletonUtilsMs: +r1.ms.toFixed(1),
        deltaMs: +r2.ms.toFixed(1),
        hipRatio: +r2.ratio.toFixed(3),
        mapped: Object.keys(r1.names).length,
        knightBones: skinnedOf(kA).skeleton.bones.length,
        ualBones: skinnedOf(src).skeleton.bones.length,
        native: NATIVE[name] || 'Idle',
      };
      return R.info;
    };
    R.update = (dt) => {
      for (const m of R.mixers) m.update(dt);
    };
    // pose report for the evaluation: angle between the forearm direction of each Knight and
    // the native/UAL reference, and the height of the head (detects broken / twisted results)
    R.measure = () => {
      const res = {};
      for (const [k, a] of Object.entries({ r128: A, delta: B, native: Cn })) {
        const s = skinnedOf(a.obj);
        const by = {};
        for (const b of s.skeleton.bones) by[strip(b.name)] = b;
        a.obj.updateMatrixWorld(true);
        const head = by.head.getWorldPosition(V3());
        const hips = by.hips.getWorldPosition(V3());
        const fl = by.footl.getWorldPosition(V3());
        res[k] = {
          headY: +(head.y - group.position.y).toFixed(3),
          hipsY: +(hips.y - group.position.y).toFixed(3),
          footLY: +(fl.y - group.position.y).toFixed(3),
          headUp: +by.head.getWorldQuaternion(new THREE.Quaternion()).angleTo(new THREE.Quaternion()).toFixed(2),
        };
      }
      return res;
    };
    R.setClip(clipNames[0]);
    return R;
  };

  return { build, viaSkeletonUtils, viaDelta, MAP };
})();
