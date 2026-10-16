// GPU allocation ledger for the test page (tools/qa/mem-tour.mjs injects it before any page
// script, like probe.js is injected after). It wraps the WebGL calls that allocate or free GPU
// memory and keeps, for every live object, its size in bytes and the phase it was made in:
// textures (texImage2D / texStorage2D / compressed / copyTexImage2D / 3D, per face and mip level),
// buffers (bufferData), renderbuffers (renderbufferStorage, multisample counted per sample),
// framebuffers, programs and shaders (counted). Read-only for the game: it measures, the calls go
// through unchanged. Sizes are nominal (what the page asked for); the driver may pad (ANGLE on
// D3D11 stores RGB8 as RGBA8: counted as 4 bytes here) and add its own internal copies.
(() => {
  if (window.__gl) return;
  const GL = WebGL2RenderingContext;
  const phase = () => {
    try {
      // Story is a top-level const of a classic script: reachable by name, not on window
      return (typeof Story !== 'undefined' && Story.S && Story.S.phase) || 'boot';
    } catch (e) {
      return 'boot';
    }
  };
  // bytes per texel for the formats three r128 uses
  const BPP = {
    [GL.RGBA8]: 4, [GL.SRGB8_ALPHA8]: 4, [GL.RGB8]: 4, [GL.SRGB8]: 4, [GL.RGBA]: 4, [GL.RGB]: 4,
    [GL.RGBA16F]: 8, [GL.RGB16F]: 8, [GL.RGBA32F]: 16, [GL.RGB32F]: 16, [GL.R8]: 1, [GL.RG8]: 2,
    [GL.R16F]: 2, [GL.RG16F]: 4, [GL.R32F]: 4, [GL.RG32F]: 8, [GL.LUMINANCE]: 1, [GL.ALPHA]: 1,
    [GL.LUMINANCE_ALPHA]: 2, [GL.DEPTH_COMPONENT16]: 2, [GL.DEPTH_COMPONENT24]: 4,
    [GL.DEPTH_COMPONENT32F]: 4, [GL.DEPTH24_STENCIL8]: 4, [GL.DEPTH32F_STENCIL8]: 8,
    [GL.DEPTH_COMPONENT]: 4, [GL.DEPTH_STENCIL]: 4, [GL.RGBA4]: 2, [GL.RGB565]: 2, [GL.RGB5_A1]: 2,
    [GL.STENCIL_INDEX8]: 1, [GL.R11F_G11F_B10F]: 4, [GL.RGB10_A2]: 4,
  };
  const bppOf = (fmt, type) => {
    let b = BPP[fmt] || 4;
    if ((fmt === GL.RGBA || fmt === GL.RGB) && (type === GL.FLOAT)) b = 16;
    if ((fmt === GL.RGBA || fmt === GL.RGB) && (type === GL.HALF_FLOAT)) b = 8;
    return b;
  };
  const dims = (src) =>
    src
      ? [src.videoWidth || src.naturalWidth || src.displayWidth || src.width || 0, src.videoHeight || src.naturalHeight || src.displayHeight || src.height || 0]
      : [0, 0];

  const live = { tex: new Map(), buf: new Map(), rb: new Map(), fb: new Map(), prog: new Map(), sh: new Map() };
  // per object: { ph, bytes, parts: Map(key -> bytes), w, h, made }
  const rec = (kind, o) => {
    if (!o) return null;
    let r = live[kind].get(o);
    if (!r) {
      r = { ph: phase(), bytes: 0, parts: new Map(), w: 0, h: 0 };
      live[kind].set(o, r);
    }
    return r;
  };
  const setPart = (r, key, bytes) => {
    if (!r) return;
    r.bytes += bytes - (r.parts.get(key) || 0);
    r.parts.set(key, bytes);
  };
  const totals = { madeTex: 0, freedTex: 0, madeBuf: 0, freedBuf: 0, upTexBytes: 0, upBufBytes: 0 };

  // what is bound, per context (one context per page here, but keep it per gl to be safe)
  const S = new WeakMap();
  const st = (gl) => {
    let s = S.get(gl);
    if (!s) {
      s = { unit: 0, tex: new Map(), buf: new Map(), vao: null, vaoElem: new Map(), rb: null };
      S.set(gl, s);
    }
    return s;
  };
  const texTarget = (t) => (t >= GL.TEXTURE_CUBE_MAP_POSITIVE_X && t <= GL.TEXTURE_CUBE_MAP_NEGATIVE_Z ? GL.TEXTURE_CUBE_MAP : t);
  const boundTex = (gl, target) => st(gl).tex.get(st(gl).unit + ':' + texTarget(target));
  const boundBuf = (gl, target) => {
    const s = st(gl);
    return target === GL.ELEMENT_ARRAY_BUFFER ? s.vaoElem.get(s.vao) : s.buf.get(target);
  };

  const wrap = (P, name, after) => {
    const f = P[name];
    if (!f) return;
    P[name] = function (...a) {
      const r = f.apply(this, a);
      try {
        after(this, a, r);
      } catch (e) {}
      return r;
    };
  };
  for (const P of [WebGL2RenderingContext.prototype, WebGLRenderingContext.prototype]) {
    wrap(P, 'createTexture', (gl, a, o) => (rec('tex', o), totals.madeTex++));
    wrap(P, 'deleteTexture', (gl, [o]) => o && live.tex.delete(o) && totals.freedTex++);
    wrap(P, 'activeTexture', (gl, [u]) => (st(gl).unit = u - GL.TEXTURE0));
    wrap(P, 'bindTexture', (gl, [t, o]) => st(gl).tex.set(st(gl).unit + ':' + t, o));
    wrap(P, 'texImage2D', (gl, a) => {
      const [target, level, ifmt] = a;
      let w, h, fmt, type;
      if (a.length >= 8) [w, h, , fmt, type] = [a[3], a[4], a[5], a[6], a[7]];
      else {
        [w, h] = dims(a[5]);
        fmt = a[3];
        type = a[4];
      }
      const r = rec('tex', boundTex(gl, target));
      const b = w * h * bppOf(ifmt, type);
      if (r && level === 0) (r.w = w), (r.h = h);
      setPart(r, target + ':' + level, b);
      totals.upTexBytes += b;
    });
    wrap(P, 'compressedTexImage2D', (gl, a) => {
      const [target, level, , w, h, , data] = a;
      const r = rec('tex', boundTex(gl, target));
      const b = data && data.byteLength ? data.byteLength : typeof a[6] === 'number' ? a[6] : 0;
      if (r && level === 0) (r.w = w), (r.h = h);
      setPart(r, target + ':' + level, b);
      totals.upTexBytes += b;
    });
    wrap(P, 'copyTexImage2D', (gl, [target, level, ifmt, x, y, w, h]) => {
      const r = rec('tex', boundTex(gl, target));
      setPart(r, target + ':' + level, w * h * bppOf(ifmt));
    });
    wrap(P, 'texStorage2D', (gl, [target, levels, ifmt, w, h]) => {
      const r = rec('tex', boundTex(gl, target));
      const faces = target === GL.TEXTURE_CUBE_MAP ? 6 : 1;
      let b = 0;
      for (let l = 0, x = w, y = h; l < levels; l++, x = Math.max(1, x >> 1), y = Math.max(1, y >> 1)) b += x * y * bppOf(ifmt);
      if (r) (r.w = w), (r.h = h);
      setPart(r, 'storage', b * faces);
      totals.upTexBytes += b * faces;
    });
    wrap(P, 'texImage3D', (gl, a) => {
      const [target, level, ifmt, w, h, d] = a;
      const r = rec('tex', boundTex(gl, target));
      setPart(r, target + ':' + level, w * h * d * bppOf(ifmt, a[8]));
    });
    wrap(P, 'texStorage3D', (gl, [target, levels, ifmt, w, h, d]) => {
      const r = rec('tex', boundTex(gl, target));
      let b = 0;
      for (let l = 0, x = w, y = h; l < levels; l++, x = Math.max(1, x >> 1), y = Math.max(1, y >> 1)) b += x * y * d * bppOf(ifmt);
      setPart(r, 'storage', b);
    });
    // a mip chain adds a third of the base level (per face for a cube)
    wrap(P, 'generateMipmap', (gl, [target]) => {
      const r = rec('tex', boundTex(gl, target));
      if (!r) return;
      let base = 0;
      r.parts.forEach((v, k) => /:0$/.test(k) && (base += v));
      setPart(r, 'mips', Math.round(base / 3));
    });

    wrap(P, 'createBuffer', (gl, a, o) => (rec('buf', o), totals.madeBuf++));
    wrap(P, 'deleteBuffer', (gl, [o]) => o && live.buf.delete(o) && totals.freedBuf++);
    wrap(P, 'bindVertexArray', (gl, [v]) => (st(gl).vao = v));
    wrap(P, 'bindBuffer', (gl, [t, o]) => {
      const s = st(gl);
      if (t === GL.ELEMENT_ARRAY_BUFFER) s.vaoElem.set(s.vao, o);
      else s.buf.set(t, o);
    });
    wrap(P, 'bufferData', (gl, a) => {
      const [target, d] = a;
      let b = 0;
      if (typeof d === 'number') b = d;
      else if (d) {
        const bpe = d.BYTES_PER_ELEMENT || 1;
        b = a.length >= 5 && a[4] ? a[4] * bpe : d.byteLength - (a[3] || 0) * bpe;
      }
      const r = rec('buf', boundBuf(gl, target));
      setPart(r, 'data', b);
      totals.upBufBytes += b;
    });

    wrap(P, 'createRenderbuffer', (gl, a, o) => rec('rb', o));
    wrap(P, 'deleteRenderbuffer', (gl, [o]) => o && live.rb.delete(o));
    wrap(P, 'bindRenderbuffer', (gl, [t, o]) => (st(gl).rb = o));
    wrap(P, 'renderbufferStorage', (gl, [t, f, w, h]) => {
      const r = rec('rb', st(gl).rb);
      if (r) (r.w = w), (r.h = h);
      setPart(r, 'data', w * h * bppOf(f));
    });
    wrap(P, 'renderbufferStorageMultisample', (gl, [t, n, f, w, h]) => {
      const r = rec('rb', st(gl).rb);
      if (r) (r.w = w), (r.h = h);
      setPart(r, 'data', w * h * bppOf(f) * Math.max(1, n));
    });
    wrap(P, 'createFramebuffer', (gl, a, o) => rec('fb', o));
    wrap(P, 'deleteFramebuffer', (gl, [o]) => o && live.fb.delete(o));
    wrap(P, 'createProgram', (gl, a, o) => rec('prog', o));
    wrap(P, 'deleteProgram', (gl, [o]) => o && live.prog.delete(o));
    wrap(P, 'createShader', (gl, a, o) => rec('sh', o));
    wrap(P, 'deleteShader', (gl, [o]) => o && live.sh.delete(o));
  }

  const MB = (b) => Math.round(b / 1048576);
  /** totals by kind, bytes alive by the phase that made them, the biggest textures */
  const summary = (top = 0) => {
    const out = { phase: phase(), kinds: {}, byPhase: {} };
    for (const k of ['tex', 'buf', 'rb', 'fb', 'prog', 'sh']) {
      let n = 0, b = 0;
      live[k].forEach((r) => {
        n++;
        b += r.bytes;
        if (k === 'tex' || k === 'buf' || k === 'rb') {
          const p = (out.byPhase[r.ph] = out.byPhase[r.ph] || { tex: 0, buf: 0, rb: 0 });
          p[k] += r.bytes;
        }
      });
      out.kinds[k] = { n, MB: +(b / 1048576).toFixed(1) };
    }
    for (const p in out.byPhase) for (const k in out.byPhase[p]) out.byPhase[p][k] = +(out.byPhase[p][k] / 1048576).toFixed(1);
    out.totalMB = +((sumOf('tex') + sumOf('buf') + sumOf('rb')) / 1048576).toFixed(1);
    out.totals = { ...totals, upTexMB: MB(totals.upTexBytes), upBufMB: MB(totals.upBufBytes) };
    delete out.totals.upTexBytes;
    delete out.totals.upBufBytes;
    if (top) {
      const t = [];
      live.tex.forEach((r) => t.push({ ph: r.ph, w: r.w, h: r.h, MB: +(r.bytes / 1048576).toFixed(2) }));
      out.topTex = t.sort((a, b) => b.MB - a.MB).slice(0, top);
    }
    return out;
  };
  const sumOf = (k) => {
    let b = 0;
    live[k].forEach((r) => (b += r.bytes));
    return b;
  };
  // after WEBGL_lose_context every object of the context is gone
  const reset = () => Object.values(live).forEach((m) => m.clear());
  window.__gl = { summary, reset, live };
})();
