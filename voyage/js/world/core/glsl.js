const NOISE3 = `
  float h3(vec3 p) {
    p = fract(p * .3183099 + .1);
    p *= 17.;
    return fract(p.x * p.y * p.z * (p.x + p.y + p.z));
  }
  float n3(vec3 x) {
    vec3 i = floor(x), f = fract(x);
    f = f * f * (3. - 2. * f);
    return mix(mix(mix(h3(i), h3(i + vec3(1., 0., 0.)), f.x), mix(h3(i + vec3(0., 1., 0.)), h3(i + vec3(1., 1., 0.)), f.x), f.y), mix(mix(h3(i + vec3(0., 0., 1.)), h3(i + vec3(1., 0., 1.)), f.x), mix(h3(i + vec3(0., 1., 1.)), h3(i + vec3(1., 1., 1.)), f.x), f.y), f.z);
  }
  float fbm3(vec3 p) {
    float v = 0., a = .5;
    for (int i = 0; i < 4; i++) {
      v += a * n3(p);
      p = p * 2.03 + vec3(1.7, 9.2, 3.1);
      a *= .5;
    }
    return v;
  }
`;
