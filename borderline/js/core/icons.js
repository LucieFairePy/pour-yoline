// Icon set: Lucide (ISC license, https://lucide.dev), vendored as path data so the game
// works offline and under file://. Card suits and other glyphs are never drawn as emoji:
// DOM text goes through Icons.rich/Icons.set, canvas text through Icons.fillText.
const Icons = (() => {
  const P = {
    heart: [
      'M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z',
    ],
    spade: [
      'M5 9c-1.5 1.5-3 3.2-3 5.5A5.5 5.5 0 0 0 7.5 20c1.8 0 3-.5 4.5-2 1.5 1.5 2.7 2 4.5 2a5.5 5.5 0 0 0 5.5-5.5c0-2.3-1.5-4-3-5.5l-7-7-7 7Z',
      'M12 18v4',
    ],
    club: [
      'M17.28 9.05a5.5 5.5 0 1 0-10.56 0A5.5 5.5 0 1 0 12 17.66a5.5 5.5 0 1 0 5.28-8.6Z',
      'M12 17.66L12 22',
    ],
    diamond: [
      'M2.7 10.3a2.41 2.41 0 0 0 0 3.41l7.59 7.59a2.41 2.41 0 0 0 3.41 0l7.59-7.59a2.41 2.41 0 0 0 0-3.41l-7.59-7.59a2.41 2.41 0 0 0-3.41 0Z',
    ],
    crown: [
      'M11.562 3.266a.5.5 0 0 1 .876 0L15.39 8.87a1 1 0 0 0 1.516.294L21.183 5.5a.5.5 0 0 1 .798.519l-2.834 10.246a1 1 0 0 1-.956.734H5.81a1 1 0 0 1-.957-.734L2.02 6.02a.5.5 0 0 1 .798-.519l4.276 3.664a1 1 0 0 0 1.516-.294z',
      'M5 21h14',
    ],
    'venetian-mask': [
      'M2 12a5 5 0 0 0 5 5 8 8 0 0 1 5 2 8 8 0 0 1 5-2 5 5 0 0 0 5-5V7h-5a8 8 0 0 0-5 2 8 8 0 0 0-5-2H2Z',
      'M6 11c1.5 0 3 .5 3 2-2 0-3 0-3-2Z',
      'M18 11c-1.5 0-3 .5-3 2 2 0 3 0 3-2Z',
    ],
    square: ['M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2Z'],
    'square-check': [
      'M5 3h14a2 2 0 0 1 2 2v14a2 2 0 0 1 -2 2h-14a2 2 0 0 1 -2 -2v-14a2 2 0 0 1 2 -2Z',
      'm9 12 2 2 4-4',
    ],
    circle: ['M2 12a10 10 0 1 0 20 0a10 10 0 1 0 -20 0Z'],
    'arrow-left': ['m12 19-7-7 7-7', 'M19 12H5'],
    mic: [
      'M12 2a3 3 0 0 0-3 3v7a3 3 0 0 0 6 0V5a3 3 0 0 0-3-3Z',
      'M19 10v2a7 7 0 0 1-14 0v-2',
      'M12 19L12 22',
    ],
    copy: [
      'M10 8h10a2 2 0 0 1 2 2v10a2 2 0 0 1 -2 2h-10a2 2 0 0 1 -2 -2v-10a2 2 0 0 1 2 -2Z',
      'M4 16c-1.1 0-2-.9-2-2V4c0-1.1.9-2 2-2h10c1.1 0 2 .9 2 2',
    ],
    check: ['M20 6 9 17l-5-5'],
    anchor: ['M12 22V8', 'M5 12H2a10 10 0 0 0 20 0h-3', 'M9 5a3 3 0 1 0 6 0a3 3 0 1 0 -6 0Z'],
    eye: [
      'M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0',
      'M9 12a3 3 0 1 0 6 0a3 3 0 1 0 -6 0Z',
    ],
    'chevrons-up': ['m17 11-5-5-5 5', 'm17 18-5-5-5 5'],
    weight: [
      'M9 5a3 3 0 1 0 6 0a3 3 0 1 0 -6 0Z',
      'M6.5 8a2 2 0 0 0-1.905 1.46L2.1 18.5A2 2 0 0 0 4 21h16a2 2 0 0 0 1.925-2.54L19.4 9.5A2 2 0 0 0 17.48 8Z',
    ],
    link: [
      'M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71',
      'M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71',
    ],
    'gamepad-2': [
      'M6 11L10 11',
      'M8 9L8 13',
      'M15 12L15.01 12',
      'M18 10L18.01 10',
      'M17.32 5H6.68a4 4 0 0 0-3.978 3.59c-.006.052-.01.101-.017.152C2.604 9.416 2 14.456 2 16a3 3 0 0 0 3 3c1 0 1.5-.5 2-1l1.414-1.414A2 2 0 0 1 9.828 16h4.344a2 2 0 0 1 1.414.586L17 18c.5.5 1 1 2 1a3 3 0 0 0 3-3c0-1.545-.604-6.584-.685-7.258-.007-.05-.011-.1-.017-.151A4 4 0 0 0 17.32 5z',
    ],
    keyboard: [
      'M10 8h.01',
      'M12 12h.01',
      'M14 8h.01',
      'M16 12h.01',
      'M18 8h.01',
      'M6 8h.01',
      'M7 16h10',
      'M8 12h.01',
      'M4 4h16a2 2 0 0 1 2 2v12a2 2 0 0 1 -2 2h-16a2 2 0 0 1 -2 -2v-12a2 2 0 0 1 2 -2Z',
    ],
    play: ['M6L3L20L12L6L21L6L3Z'],
    'rotate-ccw': ['M3 12a9 9 0 1 0 9-9 9.75 9.75 0 0 0-6.74 2.74L3 8', 'M3 3v5h5'],
  };
  const FILLED = new Set(['heart', 'spade', 'club', 'diamond', 'crown', 'circle']);
  const GLYPH = {
    '♥': 'heart',
    '♠': 'spade',
    '♣': 'club',
    '♦': 'diamond',
    '♛': 'crown',
    '\u{1F0CF}': 'venetian-mask',
    '☑': 'square-check',
    '☐': 'square',
    '●': 'circle',
    '←': 'arrow-left',
  };
  const RX = new RegExp('(' + Object.keys(GLYPH).join('|') + ')\uFE0F?', 'gu');
  const ESC = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' };
  const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ESC[c]);

  const svg = (name, cls = '') => {
    const fill = FILLED.has(name);
    const body = (P[name] || []).map((d) => `<path d="${d}"/>`).join('');
    return (
      `<svg class="ic ic-${name}${cls ? ' ' + cls : ''}" viewBox="0 0 24 24" aria-hidden="true" ` +
      `fill="${fill ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="${fill ? 1.4 : 2}" ` +
      `stroke-linecap="round" stroke-linejoin="round">${body}</svg>`
    );
  };

  // Replace glyphs in already-safe HTML.
  const glyphs = (html) => String(html).replace(RX, (m, g) => svg(GLYPH[g]));
  // Escape plain text, then replace glyphs.
  const rich = (text) => glyphs(esc(text == null ? '' : text));
  const set = (el, text) => {
    if (el) el.innerHTML = rich(text);
  };
  const has = (s) => {
    RX.lastIndex = 0;
    const r = RX.test(s);
    RX.lastIndex = 0;
    return r;
  };

  const cache = new Map();
  const paths = (name) => {
    if (!cache.has(name))
      cache.set(
        name,
        (P[name] || []).map((d) => new Path2D(d)),
      );
    return cache.get(name);
  };

  // Draw an icon centred on (cx, cy), size px tall, in the current fillStyle.
  const draw = (g, name, cx, cy, size) => {
    const k = size / 24;
    g.save();
    g.translate(cx - 12 * k, cy - 12 * k);
    g.scale(k, k);
    g.strokeStyle = g.fillStyle;
    g.lineCap = g.lineJoin = 'round';
    const fill = FILLED.has(name);
    g.lineWidth = fill ? 1.4 : Math.max(2, 2.4 / Math.max(k, 0.01));
    for (const p of paths(name)) {
      if (fill) g.fill(p);
      g.stroke(p);
    }
    g.restore();
  };

  const fontPx = (g) => {
    const m = /(\d+(?:\.\d+)?)px/.exec(g.font);
    return m ? +m[1] : 16;
  };

  // Drop-in replacement for g.fillText that renders glyphs as icons.
  const fillText = (g, str, x, y, maxW) => {
    str = String(str);
    if (!has(str)) return maxW === undefined ? g.fillText(str, x, y) : g.fillText(str, x, y, maxW);
    const size = fontPx(g);
    const gw = size * 0.82;
    const parts = [];
    let last = 0;
    str.replace(RX, (m, gl, i) => {
      if (i > last) parts.push({ t: str.slice(last, i) });
      parts.push({ ic: GLYPH[gl] });
      last = i + m.length;
    });
    if (last < str.length) parts.push({ t: str.slice(last) });
    let total = 0;
    for (const p of parts) {
      p.w = p.ic ? gw : g.measureText(p.t).width;
      total += p.w;
    }
    const al = g.textAlign;
    let sx = x;
    if (al === 'center') sx = x - total / 2;
    else if (al === 'right' || al === 'end') sx = x - total;
    const bl = g.textBaseline;
    let cy = y;
    if (bl === 'alphabetic' || bl === 'bottom' || bl === 'ideographic') cy = y - size * 0.36;
    else if (bl === 'top' || bl === 'hanging') cy = y + size * 0.5;
    g.textAlign = 'left';
    for (const p of parts) {
      if (p.ic) draw(g, p.ic, sx + p.w / 2, cy, gw);
      else g.fillText(p.t, sx, y);
      sx += p.w;
    }
    g.textAlign = al;
  };

  // Static markup: <i data-ic="heart"></i>
  const mount = (root = document) =>
    root.querySelectorAll('[data-ic]').forEach((el) => {
      el.outerHTML = svg(el.dataset.ic, el.className);
    });

  if (typeof document !== 'undefined') mount();

  return { svg, rich, glyphs, set, has, draw, fillText, mount, esc };
})();
