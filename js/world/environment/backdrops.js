const groups = {};
const place = (id, g, x, y, z) => {
  g.userData.rest = new THREE.Vector3(x, y, z);
  g.position.set(x, y, z);
  g.visible = false;
  scene.add(g);
  groups[id] = g;
  return g;
};

{
  const g = new THREE.Group();
  const moon = planet({
    r: 6,
    c1: 0x6e5a9e,
    c2: 0xc7a6d8,
    c3: 0xf2d6e8,
    atmo: 0xb48cff,
    bands: 3,
    seed: 2.3,
    rough: 0.7,
    ring: { inner: 1.35, outer: 2.3, tilt: 0.35, c1: 0x8f7cc0, c2: 0xf4e4ff },
  });
  moon.position.set(-7, -6, 2);
  g.add(moon);
  g.userData.spin = moon;
  place('intro', g, 0, 0, -16);
}

{
  const g = new THREE.Group();
  const p = planet({
    r: 7,
    c1: 0x8a2c4a,
    c2: 0xf0a68f,
    c3: 0xffe1c9,
    atmo: 0xff8fb0,
    bands: 7,
    seed: 5.1,
    clouds: true,
    cloudTint: 0xffe6ee,
  });
  p.position.set(9, -6, -6);
  g.add(p);
  g.userData.spin = p;
  const m = planet({
    r: 1.1,
    c1: 0x6f6a80,
    c2: 0xc9c2d8,
    c3: 0xffffff,
    atmo: 0xc9b8ff,
    seed: 9,
    rough: 0.8,
  });
  m.position.set(-8, 4, -14);
  g.add(m);
  place('letter', g, 0, 0, -18);
}

const ROSEG = new THREE.Group();
const NEP = planet({
  r: 8,
  c1: 0x0d2a7a,
  c2: 0x3f7fe0,
  c3: 0xbfe3ff,
  atmo: 0x5fb4ff,
  bands: 9,
  seed: 7.7,
  clouds: true,
  cloudTint: 0xe2f2ff,
});
NEP.position.set(10, -3, -36);
ROSEG.add(NEP);
ROSEG.userData.spin = NEP;
place('rose', ROSEG, 0, 0, 0);

const NEB = new THREE.Group();
place('stars', NEB, 0, 0, 0);

{
  const g = new THREE.Group();
  const p = planet({
    r: 8,
    c1: 0x7a4a12,
    c2: 0xe8b05a,
    c3: 0xfff1c4,
    atmo: 0xffc46b,
    bands: 5,
    seed: 3.3,
    ring: { inner: 1.3, outer: 2.45, tilt: -0.28, c1: 0xa07a3a, c2: 0xfff0c8 },
  });
  p.position.set(-11, -8, -14);
  g.add(p);
  g.userData.spin = p;
  place('ask', g, 0, 0, -12);
}

{
  const g = new THREE.Group();
  const p = planet({
    r: 14,
    c1: 0x0f4f5a,
    c2: 0x47c7b5,
    c3: 0xffb3d1,
    atmo: 0xff7fbf,
    bands: 4,
    seed: 11.2,
    rough: 0.55,
    ocean: 1,
    lights: 1,
    clouds: true,
  });
  p.position.set(0, -19, -8);
  g.add(p);
  g.userData.spin = p;
  place('yes', g, 0, 0, -14);
  groups.end = g;
}
