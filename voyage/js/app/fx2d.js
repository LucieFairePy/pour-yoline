const fx = $('#fx'),
  fc = fx.getContext('2d');
let sparks = [],
  floatHearts = false;
function fxResize() {
  const d = Math.min(devicePixelRatio || 1, 3);
  fx.width = W * d;
  fx.height = H * d;
  fc.setTransform(d, 0, 0, d, 0, 0);
}
fxResize();
addEventListener('resize', fxResize);
function drawHeart(x, y, s, r) {
  fc.save();
  fc.translate(x, y);
  fc.rotate(r);
  fc.scale(s / 20, s / 20);
  fc.beginPath();
  fc.moveTo(0, 6);
  fc.bezierCurveTo(-12, -2, -10, -14, 0, -7);
  fc.bezierCurveTo(10, -14, 12, -2, 0, 6);
  fc.fill();
  fc.restore();
}
const PAL = ['#d8324f', '#f2c4cc', '#e8bd84', '#fbefe6', '#a8102c'];
function burst(x, y, n = 60, power = 7) {
  if (reduced) n = Math.min(n, 14);
  for (let i = 0; i < n; i++) {
    const a = Math.random() * 6.283,
      v = (Math.random() * 0.7 + 0.3) * power;
    sparks.push({
      x,
      y,
      vx: Math.cos(a) * v,
      vy: Math.sin(a) * v - power * 0.25,
      life: 1,
      decay: 0.008 + Math.random() * 0.012,
      s: 6 + Math.random() * 12,
      rot: Math.random() * 6,
      vr: (Math.random() - 0.5) * 0.2,
      c: PAL[i % 5],
      heart: Math.random() < 0.75,
    });
  }
}
function heartBurst(x, y) {
  const n = reduced ? 20 : 72;
  for (let i = 0; i < n; i++) {
    const t = (i / n) * 6.283,
      s = Math.sin(t),
      px = 16 * s * s * s,
      py = -(13 * Math.cos(t) - 5 * Math.cos(2 * t) - 2 * Math.cos(3 * t) - Math.cos(4 * t)),
      k = 0.3 + Math.random() * 0.08;
    sparks.push({
      x,
      y,
      vx: px * k,
      vy: py * k,
      life: 1,
      decay: 0.009,
      s: 7 + Math.random() * 5,
      rot: 0,
      vr: 0,
      c: PAL[i % 3],
      heart: true,
      drag: 0.962,
    });
  }
}
(function fxLoop() {
  fc.clearRect(0, 0, W, H);
  if (floatHearts && Math.random() < 0.14)
    sparks.push({
      x: Math.random() * W,
      y: H + 20,
      vx: 0,
      vy: -(1 + Math.random() * 1.8),
      life: 1,
      decay: 0.003,
      s: 8 + Math.random() * 18,
      rot: (Math.random() - 0.5) * 0.5,
      vr: (Math.random() - 0.5) * 0.01,
      c: PAL[Math.floor(Math.random() * 3)],
      heart: true,
      float: true,
    });
  for (let i = sparks.length - 1; i >= 0; i--) {
    const p = sparks[i];
    if (p.petal) {
      p.vy = Math.min(p.vy + 0.025, 1.4);
      p.vx += Math.sin(performance.now() / 700 + p.s) * 0.03;
      p.vx *= 0.985;
      p.flip += 0.045;
    } else if (p.float) p.vx += Math.sin(performance.now() / 600 + p.s) * 0.02;
    else {
      p.vy += 0.09;
      p.vx *= p.drag || 0.985;
      p.vy *= p.drag || 0.985;
    }
    p.x += p.vx;
    p.y += p.vy;
    p.rot += p.vr;
    p.life -= p.decay;
    if (p.life <= 0 || p.y < -60) {
      sparks.splice(i, 1);
      continue;
    }
    fc.globalAlpha = Math.min(1, p.life * 1.6);
    fc.fillStyle = p.c;
    if (p.petal) {
      fc.save();
      fc.translate(p.x, p.y);
      fc.rotate(p.rot);
      fc.scale(1, 0.25 + 0.75 * Math.abs(Math.sin(p.flip)));
      fc.beginPath();
      fc.moveTo(0, -p.s * 0.6);
      fc.bezierCurveTo(p.s * 0.62, -p.s * 0.55, p.s * 0.5, p.s * 0.45, 0, p.s * 0.55);
      fc.bezierCurveTo(-p.s * 0.5, p.s * 0.45, -p.s * 0.62, -p.s * 0.55, 0, -p.s * 0.6);
      fc.fill();
      fc.globalAlpha *= 0.35;
      fc.fillStyle = '#fff';
      fc.beginPath();
      fc.ellipse(-p.s * 0.12, -p.s * 0.15, p.s * 0.12, p.s * 0.3, -0.3, 0, 6.283);
      fc.fill();
      fc.restore();
    } else if (p.chip) {
      fc.save();
      fc.translate(p.x, p.y);
      fc.rotate(p.rot);
      fc.beginPath();
      fc.moveTo(-p.s * 0.5, -p.s * 0.2);
      fc.lineTo(p.s * 0.4, -p.s * 0.35);
      fc.lineTo(p.s * 0.25, p.s * 0.3);
      fc.lineTo(-p.s * 0.3, p.s * 0.25);
      fc.closePath();
      fc.fill();
      fc.restore();
    } else p.heart ? drawHeart(p.x, p.y, p.s, p.rot) : fc.fillRect(p.x, p.y, 2.5, 2.5);
  }
  fc.globalAlpha = 1;

  if (A.an && A.on) {
    const bars = $$('#sound .bars i');
    bars.forEach((b, i) => {
      b.style.transform = `scaleY(${0.2 + (0.8 * (A.bins[3 + i * 4] || 0)) / 255})`;
    });
  }
  requestAnimationFrame(fxLoop);
})();
