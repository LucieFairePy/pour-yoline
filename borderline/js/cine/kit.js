const CineKit = (() => {
  const NOISE = `
    vec3 hash3(vec3 p) {
      p = vec3(dot(p, vec3(127.1, 311.7, 74.7)), dot(p, vec3(269.5, 183.3, 246.1)), dot(p, vec3(113.5, 271.9, 124.6)));
      return -1.0 + 2.0 * fract(sin(p) * 43758.5453123);
    }
    float noise(vec3 p) {
      vec3 i = floor(p);
      vec3 f = fract(p);
      vec3 u = f * f * (3.0 - 2.0 * f);
      return mix(mix(mix(dot(hash3(i), f), dot(hash3(i + vec3(1, 0, 0)), f - vec3(1, 0, 0)), u.x),
                     mix(dot(hash3(i + vec3(0, 1, 0)), f - vec3(0, 1, 0)), dot(hash3(i + vec3(1, 1, 0)), f - vec3(1, 1, 0)), u.x), u.y),
                 mix(mix(dot(hash3(i + vec3(0, 0, 1)), f - vec3(0, 0, 1)), dot(hash3(i + vec3(1, 0, 1)), f - vec3(1, 0, 1)), u.x),
                     mix(dot(hash3(i + vec3(0, 1, 1)), f - vec3(0, 1, 1)), dot(hash3(i + vec3(1, 1, 1)), f - vec3(1, 1, 1)), u.x), u.y), u.z);
    }
    float fbm(vec3 p) {
      float v = 0.0;
      float a = 0.5;
      for (int i = 0; i < 6; i++) {
        v += a * noise(p);
        p *= 2.03;
        a *= 0.5;
      }
      return v;
    }
  `;

  const nebula = () => {
    const U = {
      uTime: { value: 0 },
      uMix: { value: 0 },
      uDark: { value: 0 },
      uRed: { value: 0 },
    };
    const m = new THREE.Mesh(
      new THREE.SphereGeometry(900, 64, 32),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        depthWrite: false,
        uniforms: U,
        vertexShader: `
          varying vec3 vDir;
          void main() {
            vDir = normalize(position);
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform float uMix;
          uniform float uDark;
          uniform float uRed;
          varying vec3 vDir;
          ${NOISE}
          float h(vec3 p) { return fract(sin(dot(p, vec3(12.9898, 78.233, 37.719))) * 43758.5453); }
          void main() {
            vec3 d = normalize(vDir);
            float n = fbm(d * 2.2 + vec3(0.0, 0.0, uTime * 0.004));
            float n2 = fbm(d * 4.5 + n * 1.5);
            vec3 a1 = vec3(0.32, 0.06, 0.28);
            vec3 b1 = vec3(0.95, 0.35, 0.55);
            vec3 c1 = vec3(0.10, 0.05, 0.30);
            vec3 a2 = vec3(0.03, 0.18, 0.22);
            vec3 b2 = vec3(0.95, 0.72, 0.35);
            vec3 c2 = vec3(0.02, 0.08, 0.18);
            vec3 A = mix(a1, a2, uMix);
            vec3 B = mix(b1, b2, uMix);
            vec3 C = mix(c1, c2, uMix);
            float neb = smoothstep(0.0, 0.7, n * 0.9 + 0.35);
            vec3 col = C * 0.25;
            col += A * neb * 0.55;
            col += B * pow(max(0.0, n2 + n * 0.6), 2.6) * 0.9;
            float band = exp(-pow(d.y * 3.0 + n * 0.8, 2.0));
            col += mix(b1, b2, uMix) * band * 0.18;
            vec3 c = floor(d * 420.0);
            float s = h(c);
            float tw = 0.7 + 0.3 * sin(uTime * (1.0 + s * 4.0) + s * 50.0);
            col += vec3(1.0, 0.95, 0.9) * step(0.9965, s) * tw * 1.4;
            col += vec3(0.8, 0.9, 1.0) * step(0.9993, h(c + 7.0)) * 3.0;
            col = mix(col, col * vec3(1.5, 0.3, 0.35), uRed);
            col *= 1.0 - uDark;
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      }),
    );
    m.renderOrder = -10;
    return { mesh: m, U };
  };

  const heart = (N = 14000, scale = 1) => {
    const pos = new Float32Array(N * 3);
    const col = new Float32Array(N * 3);
    const r = rng(11);
    const c1 = new THREE.Color('#ff6a96');
    const c2 = new THREE.Color('#ffe6c8');
    const c3 = new THREE.Color('#b07cff');
    const tmp = new THREE.Color();
    for (let i = 0; i < N; i++) {
      const t = r() * TAU;
      const hx = 16 * Math.pow(Math.sin(t), 3);
      const hy = 13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t);
      const k = Math.pow(r(), 0.55);
      const sp = (1 - k) * 4.5 + 0.5;
      const sw = (r() - 0.5) * 0.6;
      pos[i * 3] = (hx * k + (r() - 0.5) * sp) * scale;
      pos[i * 3 + 1] = (hy * k + (r() - 0.5) * sp + sw) * scale;
      pos[i * 3 + 2] = (r() - 0.5) * 5 * scale * (1 - k * 0.5);
      tmp
        .copy(c1)
        .lerp(c2, Math.pow(1 - k, 2.2))
        .lerp(c3, r() * 0.3);
      const br = 0.45 + 0.75 * k;
      col.set([tmp.r * br, tmp.g * br, tmp.b * br], i * 3);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.Points(
      g,
      new THREE.PointsMaterial({
        size: 0.5 * scale,
        vertexColors: true,
        transparent: true,
        opacity: 1,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    return m;
  };

  const blackHole = () => {
    const g = new THREE.Group();
    const core = new THREE.Mesh(
      new THREE.SphereGeometry(1, 48, 32),
      new THREE.MeshBasicMaterial({ color: '#000' }),
    );
    g.add(core);
    const U = { uTime: { value: 0 }, uHot: { value: 1 } };
    const disk = new THREE.Mesh(
      new THREE.RingGeometry(1.35, 4.4, 160, 1),
      new THREE.ShaderMaterial({
        side: THREE.DoubleSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: U,
        vertexShader: `
          varying vec2 vP;
          void main() {
            vP = position.xy;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform float uHot;
          varying vec2 vP;
          ${NOISE}
          void main() {
            float r = length(vP);
            float a = atan(vP.y, vP.x);
            float sw = a + uTime * (2.2 / r) + log(r) * 3.0;
            float n = fbm(vec3(cos(sw) * 2.0, sin(sw) * 2.0, r * 2.5));
            float k = smoothstep(4.4, 1.4, r);
            float bands = 0.55 + 0.45 * sin(r * 14.0 + n * 6.0);
            vec3 hot = vec3(1.0, 0.92, 0.85);
            vec3 mid = vec3(1.0, 0.45, 0.35);
            vec3 cold = vec3(0.65, 0.15, 0.55);
            vec3 col = mix(cold, mid, smoothstep(0.2, 0.6, k));
            col = mix(col, hot, smoothstep(0.7, 1.0, k));
            float alpha = k * bands * (0.6 + n * 0.8) * smoothstep(1.35, 1.6, r);
            gl_FragColor = vec4(col * alpha * 2.4 * uHot, alpha);
          }
        `,
      }),
    );
    disk.rotation.x = -1.25;
    g.add(disk);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(1.18, 0.05, 12, 128),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ffd9c4').multiplyScalar(3),
        toneMapped: false,
      }),
    );
    g.add(ring);
    const halo = new THREE.Mesh(
      new THREE.RingGeometry(1.0, 2.2, 96),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        vertexShader: `varying vec2 vP; void main(){ vP = position.xy; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `varying vec2 vP; void main(){ float r = length(vP); float a = exp(-pow((r - 1.25) * 5.0, 2.0)); gl_FragColor = vec4(vec3(1.0,0.6,0.7) * a * 1.4, a); }`,
      }),
    );
    g.add(halo);
    return { group: g, U, halo, disk };
  };

  const warp = (N = 1800) => {
    const pos = new Float32Array(N * 6);
    const col = new Float32Array(N * 6);
    const seeds = [];
    const r = rng(77);
    const palette = [
      new THREE.Color('#7ce0ff'),
      new THREE.Color('#ff6a96'),
      new THREE.Color('#ffe2c4'),
      new THREE.Color('#b07cff'),
    ];
    for (let i = 0; i < N; i++) {
      const a = r() * TAU;
      const rad = 2 + Math.pow(r(), 0.7) * 18;
      seeds.push({ x: Math.cos(a) * rad, y: Math.sin(a) * rad, z: r() * 300, len: 3 + r() * 10 });
      const c = palette[(r() * palette.length) | 0];
      col.set([c.r * 2, c.g * 2, c.b * 2, c.r * 0.2, c.g * 0.2, c.b * 0.2], i * 6);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    const m = new THREE.LineSegments(
      g,
      new THREE.LineBasicMaterial({
        vertexColors: true,
        transparent: true,
        blending: THREE.AdditiveBlending,
        depthWrite: false,
        toneMapped: false,
      }),
    );
    m.frustumCulled = false;
    return {
      mesh: m,
      set(t, speed = 120, stretch = 1) {
        seeds.forEach((s, i) => {
          const z = -((s.z + t * speed) % 300);
          pos.set([s.x, s.y, z, s.x, s.y, z - s.len * stretch], i * 6);
        });
        g.attributes.position.needsUpdate = true;
      },
    };
  };

  const rockGeo = (() => {
    const g = new THREE.IcosahedronGeometry(1, 3);
    const p = g.attributes.position;
    const v = new THREE.Vector3();
    const r = rng(5);
    const bumps = Array.from({ length: 14 }, () => [
      V3(r() - 0.5, r() - 0.5, r() - 0.5).normalize(),
      0.15 + r() * 0.35,
      r() * 0.25,
    ]);
    for (let i = 0; i < p.count; i++) {
      v.fromBufferAttribute(p, i);
      let d = 1;
      bumps.forEach(([dir, w, a]) => {
        const k = v.clone().normalize().dot(dir);
        d -= Math.exp(-Math.pow((1 - k) / w, 2) * 2) * a;
      });
      d += Math.sin(v.x * 6.1) * Math.sin(v.y * 5.3) * Math.sin(v.z * 4.7) * 0.06;
      v.multiplyScalar(d);
      p.setXYZ(i, v.x, v.y * 0.85, v.z);
    }
    g.computeVertexNormals();
    return g;
  })();

  const rockMat = new THREE.MeshStandardMaterial({
    color: '#4a3c42',
    roughness: 0.92,
    metalness: 0.08,
    flatShading: true,
  });

  const asteroids = (N = 900) => {
    const inst = new THREE.InstancedMesh(rockGeo, rockMat, N);
    const r = rng(9);
    const data = [];
    for (let i = 0; i < N; i++) {
      const z = -r() * 900;
      const lane = r() < 0.6;
      const rad = lane ? 8 + r() * 30 : 25 + r() * 160;
      const a = r() * TAU;
      data.push({
        p: V3(Math.cos(a) * rad, Math.sin(a) * rad * 0.6, z),
        s: Math.pow(r(), 2.2) * (lane ? 4 : 14) + 0.3,
        rot: V3(r() * TAU, r() * TAU, r() * TAU),
        sp: V3(r() - 0.5, r() - 0.5, r() - 0.5).multiplyScalar(0.4),
      });
    }
    inst.frustumCulled = false;
    const m4 = new THREE.Matrix4();
    const q = new THREE.Quaternion();
    const e = new THREE.Euler();
    const sc = V3();
    return {
      mesh: inst,
      set(t, offsetZ = 0) {
        data.forEach((d, i) => {
          e.set(d.rot.x + d.sp.x * t, d.rot.y + d.sp.y * t, d.rot.z + d.sp.z * t);
          q.setFromEuler(e);
          sc.setScalar(d.s);
          m4.compose(V3(d.p.x, d.p.y, d.p.z + offsetZ), q, sc);
          inst.setMatrixAt(i, m4);
        });
        inst.instanceMatrix.needsUpdate = true;
      },
    };
  };

  const bigRock = () => {
    const m = new THREE.Mesh(rockGeo, rockMat);
    return m;
  };

  const ship = () => {
    const g = new THREE.Group();
    const prof = [
      [0, 1.6],
      [2.2, 1.4],
      [5, 0.8],
      [9, 0.25],
      [11, 0],
      [9, -0.35],
      [5, -0.9],
      [2.4, -1.3],
      [0, -1.4],
    ].map(([x, y]) => new THREE.Vector2(x, y));
    const hull = new THREE.Mesh(
      new THREE.LatheGeometry(prof, 96),
      new THREE.MeshStandardMaterial({
        color: '#c6cbe0',
        metalness: 0.75,
        roughness: 0.28,
        emissive: '#1a1a2e',
      }),
    );
    g.add(hull);
    const dome = new THREE.Mesh(
      new THREE.SphereGeometry(2.4, 48, 24, 0, TAU, 0, Math.PI / 2),
      new THREE.MeshStandardMaterial({
        color: '#7ce0ff',
        metalness: 0.1,
        roughness: 0.05,
        emissive: '#2a8aa8',
        transparent: true,
        opacity: 0.85,
      }),
    );
    dome.position.y = 1.4;
    g.add(dome);
    const lights = new THREE.Group();
    const lm = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#7ce0ff').multiplyScalar(3),
      toneMapped: false,
    });
    const lm2 = new THREE.MeshBasicMaterial({
      color: new THREE.Color('#ff6a96').multiplyScalar(3),
      toneMapped: false,
    });
    for (let i = 0; i < 36; i++) {
      const a = (i / 36) * TAU;
      const b = new THREE.Mesh(new THREE.SphereGeometry(0.16, 8, 6), i % 3 ? lm : lm2);
      b.position.set(Math.cos(a) * 10.2, 0.05, Math.sin(a) * 10.2);
      lights.add(b);
    }
    g.add(lights);
    const ring = new THREE.Mesh(
      new THREE.TorusGeometry(6.5, 0.22, 12, 96).rotateX(Math.PI / 2),
      new THREE.MeshStandardMaterial({
        color: '#9aa4c4',
        metalness: 0.9,
        roughness: 0.2,
        emissive: '#3a2a6a',
      }),
    );
    ring.position.y = -1.0;
    g.add(ring);
    const under = new THREE.Mesh(
      new THREE.CircleGeometry(2.3, 48).rotateX(Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#bff4ff').multiplyScalar(3),
        toneMapped: false,
      }),
    );
    under.position.y = -1.42;
    g.add(under);
    const BU = { uTime: { value: 0 }, uOn: { value: 0 } };
    const beam = new THREE.Mesh(
      new THREE.CylinderGeometry(2.2, 9, 40, 64, 1, true).translate(0, -20, 0),
      new THREE.ShaderMaterial({
        transparent: true,
        depthWrite: false,
        side: THREE.DoubleSide,
        blending: THREE.AdditiveBlending,
        uniforms: BU,
        vertexShader: `varying vec2 vUv; void main(){ vUv = uv; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `
          uniform float uTime;
          uniform float uOn;
          varying vec2 vUv;
          void main() {
            float stripes = 0.6 + 0.4 * sin(vUv.y * 40.0 + uTime * 6.0);
            float edge = 0.35 + 0.65 * pow(abs(sin(vUv.x * 3.14159 * 8.0 + uTime)), 6.0);
            float a = smoothstep(0.0, 0.25, vUv.y) * (0.25 + 0.4 * stripes) * uOn;
            gl_FragColor = vec4(vec3(0.6, 0.95, 1.0) * a * (0.7 + edge * 0.6), a);
          }
        `,
      }),
    );
    beam.position.y = -1.4;
    g.add(beam);
    return { group: g, lights, ring, beam, BU };
  };

  const planet = () => {
    const g = new THREE.Group();
    const U = { uTime: { value: 0 }, uSun: { value: V3(1, 0.3, 0.6).normalize() } };
    const surf = new THREE.Mesh(
      new THREE.SphereGeometry(60, 128, 96),
      new THREE.ShaderMaterial({
        uniforms: U,
        vertexShader: `
          varying vec3 vN;
          varying vec3 vP;
          varying vec3 vW;
          void main() {
            vN = normalize(normalMatrix * normal);
            vP = position;
            vW = (modelMatrix * vec4(position, 1.0)).xyz;
            gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
          }
        `,
        fragmentShader: `
          uniform float uTime;
          uniform vec3 uSun;
          varying vec3 vN;
          varying vec3 vP;
          varying vec3 vW;
          ${NOISE}
          void main() {
            vec3 p = normalize(vP);
            float h = fbm(p * 2.6 + 3.1) + 0.35 * fbm(p * 9.0);
            float land = smoothstep(0.08, 0.13, h);
            float lat = abs(p.y);
            vec3 deep = vec3(0.01, 0.06, 0.18);
            vec3 shallow = vec3(0.03, 0.25, 0.42);
            vec3 ocean = mix(deep, shallow, smoothstep(-0.2, 0.1, h));
            vec3 green = vec3(0.12, 0.36, 0.12);
            vec3 dry = vec3(0.45, 0.38, 0.22);
            vec3 snow = vec3(0.92, 0.95, 1.0);
            vec3 ground = mix(green, dry, smoothstep(0.25, 0.45, h + fbm(p * 20.0) * 0.1));
            ground = mix(ground, snow, smoothstep(0.72, 0.85, lat + h * 0.2));
            vec3 col = mix(ocean, ground, land);
            vec3 n = normalize(vN);
            vec3 sun = normalize((viewMatrix * vec4(uSun, 0.0)).xyz);
            float diff = max(dot(n, sun), 0.0);
            vec3 v = normalize(-(viewMatrix * vec4(vW, 1.0)).xyz);
            float spec = pow(max(dot(reflect(-sun, n), v), 0.0), 60.0) * (1.0 - land) * 1.4;
            float night = smoothstep(0.1, -0.15, dot(n, sun));
            float cities = step(0.62, fbm(p * 40.0)) * land * night;
            col = col * (0.05 + diff * 1.1) + vec3(1.0, 0.85, 0.6) * spec + vec3(1.0, 0.75, 0.4) * cities * 1.5;
            float rim = pow(1.0 - max(dot(n, v), 0.0), 3.0);
            col += vec3(0.3, 0.6, 1.0) * rim * (0.2 + diff) * 0.8;
            gl_FragColor = vec4(col, 1.0);
          }
        `,
      }),
    );
    g.add(surf);
    const clouds = new THREE.Mesh(
      new THREE.SphereGeometry(60.8, 96, 64),
      new THREE.ShaderMaterial({
        uniforms: U,
        transparent: true,
        depthWrite: false,
        vertexShader: `varying vec3 vP; varying vec3 vN; void main(){ vP = position; vN = normalize(normalMatrix * normal); gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `
          uniform float uTime;
          uniform vec3 uSun;
          varying vec3 vP;
          varying vec3 vN;
          ${NOISE}
          void main() {
            vec3 p = normalize(vP);
            float c = fbm(p * 4.0 + vec3(uTime * 0.01, 0.0, 0.0) + fbm(p * 8.0) * 0.6);
            float a = smoothstep(0.05, 0.4, c) * 0.85;
            vec3 sun = normalize((viewMatrix * vec4(uSun, 0.0)).xyz);
            float d = max(dot(normalize(vN), sun), 0.0);
            gl_FragColor = vec4(vec3(1.0) * (0.08 + d), a);
          }
        `,
      }),
    );
    g.add(clouds);
    const atmo = new THREE.Mesh(
      new THREE.SphereGeometry(66, 96, 64),
      new THREE.ShaderMaterial({
        side: THREE.BackSide,
        transparent: true,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        uniforms: U,
        vertexShader: `varying vec3 vN; varying vec3 vW; void main(){ vN = normalize(normalMatrix * normal); vW = (modelViewMatrix * vec4(position,1.0)).xyz; gl_Position = projectionMatrix * modelViewMatrix * vec4(position,1.0); }`,
        fragmentShader: `
          uniform vec3 uSun;
          varying vec3 vN;
          varying vec3 vW;
          void main() {
            vec3 v = normalize(-vW);
            float rim = pow(1.0 - abs(dot(normalize(vN), v)), 2.2);
            vec3 sun = normalize((viewMatrix * vec4(uSun, 0.0)).xyz);
            float lit = 0.25 + max(dot(normalize(vN), sun), 0.0);
            gl_FragColor = vec4(vec3(0.35, 0.65, 1.0) * rim * lit * 1.6, rim);
          }
        `,
      }),
    );
    g.add(atmo);
    return { group: g, U, clouds };
  };

  const cardTex = (() => {
    const c = document.createElement('canvas');
    c.width = 128;
    c.height = 180;
    const x = c.getContext('2d');
    x.fillStyle = '#fff8f0';
    x.fillRect(0, 0, 128, 180);
    x.strokeStyle = '#d8324f';
    x.lineWidth = 4;
    x.strokeRect(6, 6, 116, 168);
    x.fillStyle = '#d8324f';
    x.font = '80px Georgia';
    x.textAlign = 'center';
    x.textBaseline = 'middle';
    x.fillText('♥', 64, 95);
    return new THREE.CanvasTexture(c);
  })();

  const cards = (n = 52) => {
    const g = new THREE.Group();
    const mat = new THREE.MeshBasicMaterial({
      map: cardTex,
      side: THREE.DoubleSide,
      toneMapped: false,
      transparent: true,
    });
    mat.color.setScalar(1.5);
    const list = [];
    for (let i = 0; i < n; i++) {
      const m = new THREE.Mesh(new THREE.PlaneGeometry(0.5, 0.7), mat);
      g.add(m);
      list.push(m);
    }
    return { group: g, list, mat };
  };

  const glowHeart = () => {
    const s = new THREE.Shape();
    for (let i = 0; i <= 64; i++) {
      const t = (i / 64) * TAU;
      const x = (16 * Math.pow(Math.sin(t), 3)) / 16;
      const y =
        (13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)) / 16;
      if (i === 0) s.moveTo(x, y);
      else s.lineTo(x, y);
    }
    const m = new THREE.Mesh(
      new THREE.ShapeGeometry(s),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ff6a96').multiplyScalar(4),
        toneMapped: false,
        transparent: true,
        side: THREE.DoubleSide,
      }),
    );
    return m;
  };

  return { nebula, heart, blackHole, warp, asteroids, bigRock, ship, planet, cards, glowHeart };
})();
