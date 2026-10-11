const BH = {
  pos: mobile ? new THREE.Vector3(-1.5, 9, -34) : new THREE.Vector3(-9, 6.5, -34),
  s: 0,
  r: mobile ? 0.075 : 0.095,
};
const POST = {
  tDiffuse: { value: null },
  uTime: time,
  uAberr: { value: 0 },
  uWarp: { value: 0 },
  uBH: { value: 0 },
  uBHPos: { value: new THREE.Vector2(0.7, 0.65) },
  uBHR: { value: 0.05 },
  uAspect: { value: W / H },
  uGloom: { value: 0 },
  uFlash: { value: 0 },
  uFlashC: { value: new THREE.Color(1, 0.85, 0.95) },
};
let composer = null,
  bloom = null;
if (THREE.EffectComposer && THREE.UnrealBloomPass) {
  const gl2 = renderer.capabilities.isWebGL2 && THREE.WebGLMultisampleRenderTarget;
  const rt = gl2
    ? new THREE.WebGLMultisampleRenderTarget(W * PR, H * PR, {
        format: THREE.RGBAFormat,
        type: THREE.UnsignedByteType,
      })
    : undefined;
  if (rt) rt.samples = 4;
  composer = new THREE.EffectComposer(renderer, rt);
  composer.addPass(new THREE.RenderPass(scene, camera));
  bloom = new THREE.UnrealBloomPass(
    new THREE.Vector2(W, H),
    mobile ? 0.62 : 0.78,
    0.55,
    mobile ? 0.9 : 0.86,
  );
  composer.addPass(bloom);
  const fin = new THREE.ShaderPass({
    uniforms: POST,
    vertexShader: `
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.);
      }
    `,
    fragmentShader: `
      uniform sampler2D tDiffuse;
      uniform float uTime, uAberr, uWarp, uBH, uBHR, uAspect, uGloom, uFlash;
      uniform vec2 uBHPos;
      uniform vec3 uFlashC;
      varying vec2 vUv;
      void main() {
        vec2 uv = vUv;
        vec2 bd = uv - uBHPos;
        bd.x *= uAspect;
        float br = length(bd);
        if (uBH > 0.) {
          float rs = uBHR;
          uv -= normalize(bd + 1e-5) * (uBH * rs * rs * 1.4 / max(br, rs * .6)) * vec2(1. / uAspect, 1.);
        }
        vec3 col;
        if (uWarp > .01) {
          vec2 dir = uv - .5;
          col = vec3(0.);
          for (int i = 0; i < 10; i++) {
            float k = 1. - float(i) * .013 * uWarp;
            col += texture2D(tDiffuse, .5 + dir * k).rgb;
          }
          col /= 10.;
          col = mix(texture2D(tDiffuse, uv).rgb, col, .7) * (1. - uWarp * .3);
        } else {
          vec2 d = uv - .5;
          vec2 off = d * (.003 + uAberr * .03) * (.6 + dot(d, d) * 2.5);
          col = vec3(texture2D(tDiffuse, uv + off).r, texture2D(tDiffuse, uv).g, texture2D(tDiffuse, uv - off).b);
        }
        if (uBH > 0.) {
          float rs = uBHR;
          vec2 q = bd;
          q = mat2(.94, -.34, .34, .94) * q;
          q.y *= 3.4;
          float dr = length(q);
          float disk = smoothstep(rs * 3.6, rs * 1.25, dr) * smoothstep(rs * 1.05, rs * 1.35, dr);
          float sw = .55 + .45 * sin(atan(q.y, q.x) * 3. - uTime * 3.5 + dr * 60.);
          float ring = exp(-pow((br - rs * 1.18) / (rs * .1), 2.));
          col += (vec3(1., .5, .2) * disk * sw * 1.6 + vec3(1., .82, .6) * ring * 1.6) * min(uBH * 1.6, 1.);
          col = mix(col, vec3(0.), smoothstep(rs, rs * .9, br) * min(uBH * 3., 1.));
        }
        float l = dot(col, vec3(.299, .587, .114));
        col = mix(col, vec3(l) * vec3(.85, .92, 1.1), uGloom * .85);
        col += uFlashC * uFlash;
        vec2 vg = vUv - .5;
        col *= 1. - dot(vg, vg) * .55;
        col = col / (1. + col * .15);
        gl_FragColor = vec4(col, 1.);
      }
    `,
  });
  fin.uniforms = POST;
  fin.material.uniforms = POST;
  composer.addPass(fin);
  composer.setPixelRatio && composer.setPixelRatio(PR);
  composer.setSize(W, H);
}
