const ENV_GLSL = `
  vec3 procEnv(vec3 d, float r) {
    d = normalize(d);
    vec3 c = mix(vec3(.02, .01, .035), vec3(.16, .06, .2), smoothstep(-.6, .9, d.y));
    c += vec3(.06, .12, .32) * pow(max(0., dot(d, normalize(vec3(-.8, -.2, -.5)))), 3.);
    c += vec3(.35, .1, .22) * pow(max(0., dot(d, normalize(vec3(.4, -.6, .7)))), 4.);
    c += vec3(.55, .42, .62) * exp(-pow(dot(d, normalize(vec3(.25, 1., .35))) * 3., 2.)) * .45;
    c += vec3(.95, .7, .45) * pow(max(0., d.y * .5 + .5), 3.) * .18;
    float sp = mix(400., 6., r * r);
    c += vec3(1.5, 1.38, 1.3) * pow(max(0., dot(d, uEnvSun)), sp) * mix(1., .12, r);
    return c;
  }
`;
function envPatch(sh, k = 1) {
  sh.uniforms.uEnvSun = { value: SUN };
  sh.uniforms.uEnvK = { value: k };
  sh.fragmentShader = sh.fragmentShader
    .replace(
      '#include <common>',
      '#include <common>' +
        String.fromCharCode(10) +
        'uniform vec3 uEnvSun; uniform float uEnvK;' +
        ENV_GLSL,
    )
    .replace(
      '#include <lights_fragment_end>',
      `
        #include <lights_fragment_end>
        {
          vec3 rv = inverseTransformDirection(reflect(-normalize(vViewPosition), normal), viewMatrix);
          float fr = pow(1. - saturate(dot(normal, normalize(vViewPosition))), 5.);
          vec3 F = mix(material.specularColor, vec3(1.), fr * (1. - material.specularRoughness));
          reflectedLight.indirectSpecular += procEnv(rv, material.specularRoughness) * F * uEnvK;
          reflectedLight.indirectDiffuse += procEnv(inverseTransformDirection(normal, viewMatrix), 1.) * material.diffuseColor * .3 * uEnvK;
        }
      `,
    );
}
const pbr = (opts, k = 1) => {
  const m = new THREE.MeshStandardMaterial(opts);
  m.onBeforeCompile = (sh) => envPatch(sh, k);
  return m;
};
scene.add(new THREE.HemisphereLight(0xb9a0ff, 0x2a0f2a, 0.35));

function sequinMat(color, { rough = 0.62, metal = 0.06, glint = 1, quilt = 1 } = {}) {
  const m = new THREE.MeshStandardMaterial({ color, roughness: rough, metalness: metal });
  m.onBeforeCompile = (sh) => {
    envPatch(sh, 0.8);
    sh.uniforms.uTime = time;
    sh.uniforms.uGlint = { value: glint };
    sh.uniforms.uQuilt = { value: quilt };
    sh.vertexShader = sh.vertexShader
      .replace('#include <common>', '#include <common>\nvarying vec3 vObj;')
      .replace(
        '#include <begin_vertex>',
        '#include <begin_vertex>\nvObj = position * vec3(length(modelMatrix[0].xyz), length(modelMatrix[1].xyz), length(modelMatrix[2].xyz));',
      );
    sh.fragmentShader = sh.fragmentShader
      .replace(
        '#include <common>',
        '#include <common>\nuniform float uTime, uGlint, uQuilt; varying vec3 vObj;\nfloat sq(vec3 p){ return fract(sin(dot(p, vec3(127.1, 311.7, 74.7))) * 43758.5453); }' +
          NOISE3 +
          '\nfloat foldF(vec3 p){ vec3 q = p * vec3(7., 15., 7.) + vec3(0., p.x * 4., 0.); return n3(q) * .65 + n3(q * 2.1 + 3.7) * .35; }',
      )
      .replace(
        '#include <color_fragment>',
        `#include <color_fragment>
        float fo = foldF(vObj);
        float cav = smoothstep(.62, .3, fo);
        diffuseColor.rgb *= mix(1., .7 + .3 * cav, .55) * (.94 + .1 * n3(vObj * 60.));`,
      )
      .replace(
        '#include <roughnessmap_fragment>',
        `
          #include <roughnessmap_fragment>
          vec3 wq = vObj * 340.;
          float twill = .5 + .5 * sin(wq.x + wq.y + wq.z);
          vec3 gq = abs(fract(vObj * 34.) - .5);
          float rip = smoothstep(.43, .49, max(gq.x, max(gq.y, gq.z))) * uQuilt;
          roughnessFactor = clamp(roughnessFactor * (.88 + .22 * twill) + rip * .06, .05, 1.);
        `,
      )
      .replace(
        '#include <normal_fragment_maps>',
        `
          #include <normal_fragment_maps>
          {
            float e = .012, f0 = foldF(vObj);
            vec3 gr = vec3(foldF(vObj + vec3(e, 0., 0.)) - f0, foldF(vObj + vec3(0., e, 0.)) - f0, foldF(vObj + vec3(0., 0., e)) - f0) / e;
            vec3 gv = (viewMatrix * vec4(gr, 0.)).xyz;
            normal = normalize(normal - (gv - normal * dot(gv, normal)) * .028);
            normal = normalize(normal + vec3(sin(wq.x + wq.y), sin(wq.y - wq.z), 0.) * .018 + vec3(rip * .018));
          }
          vec3 cell = floor(vObj * 210.);
          float hs = sq(cell);
          vec3 sN = normalize(normal + (vec3(sq(cell + 1.), sq(cell + 2.), sq(cell + 3.)) - .5) * 1.1);
        `,
      )
      .replace(
        '#include <emissivemap_fragment>',
        `
          #include <emissivemap_fragment>
          vec3 Vd = normalize(vViewPosition);
          float sheen = pow(1. - saturate(dot(normal, Vd)), 3.2);
          totalEmissiveRadiance += diffuseColor.rgb * sheen * .3 + vec3(.1, .07, .14) * sheen * .18;
          float gl = pow(max(0., dot(reflect(-Vd, sN), normalize(vec3(.45, .6, .65)))), 90.) * step(.72, hs);
          float tw = .45 + .55 * sin(uTime * 2.6 + hs * 50.);
          totalEmissiveRadiance += mix(vec3(1., .93, .72), vec3(.75, 1., .88), hs) * gl * tw * 2.4 * uGlint;
        `,
      );
  };
  return m;
}
const suitMat = sequinMat(0x006a3a, { rough: 0.55, metal: 0.12 });
const white = (() => {
  const m = new THREE.MeshPhysicalMaterial({
    color: 0xcfcbd6,
    roughness: 0.5,
    metalness: 0,
    clearcoat: 0.85,
    clearcoatRoughness: 0.14,
  });
  m.onBeforeCompile = (sh) => envPatch(sh, 0.75);
  return m;
})();
const cloth = sequinMat(0xd4cfd9, { rough: 0.74, metal: 0.04, glint: 0 });
const gold = pbr({ color: 0xe6b456, roughness: 0.22, metalness: 1 }, 2.2);
const chromeMat = pbr({ color: 0xd8d6e0, roughness: 0.16, metalness: 1 }, 2.2);
const dark = pbr({ color: 0x24202c, roughness: 0.45, metalness: 0.55 }, 1.4);
const rubber = new THREE.MeshStandardMaterial({ color: 0x1a171e, roughness: 0.85, metalness: 0 });
