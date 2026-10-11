const grid = document.getElementById('grid');
const veil = document.getElementById('veil');
const reduce = matchMedia('(prefers-reduced-motion: reduce)').matches;

const pad = (n) => String(n).padStart(2, '0');

SITES.forEach((s, i) => {
  const li = document.createElement('li');
  li.innerHTML = `
    <a class="bubble" href="${s.href}" style="--d:${i * 0.12 + 0.35}s">
      <span class="media"><img src="${s.img}" alt="" loading="${i < 2 ? 'eager' : 'lazy'}"></span>
      <span class="shade"></span>
      <span class="ring"></span>
      <span class="meta">
        <span class="row"><span class="num">${pad(i + 1)}</span><span class="tag">${s.tag}</span></span>
        <span class="name">${s.title}</span>
        <span class="sub">${s.sub}</span>
        <span class="go">Embarquer <i></i></span>
      </span>
    </a>`;
  grid.appendChild(li);
});

const soon = document.createElement('li');
soon.innerHTML = `
  <div class="bubble soon" style="--d:${SITES.length * 0.12 + 0.35}s" aria-label="Prochaine destination, bientôt">
    <span class="orbit"><i></i></span>
    <span class="meta">
      <span class="row"><span class="num">${pad(SITES.length + 1)}</span><span class="tag">Bientôt</span></span>
      <span class="name">Prochaine destination</span>
      <span class="sub">Encore en construction, quelque part dans l’espace</span>
    </span>
  </div>`;
grid.appendChild(soon);

document.getElementById('count').textContent =
  `${pad(SITES.length)} destination${SITES.length > 1 ? 's' : ''}`;

grid.querySelectorAll('a.bubble').forEach((a) => {
  if (!reduce) {
    a.addEventListener('pointermove', (e) => {
      const r = a.getBoundingClientRect();
      const x = (e.clientX - r.left) / r.width - 0.5;
      const y = (e.clientY - r.top) / r.height - 0.5;
      a.style.setProperty('--rx', `${(-y * 6).toFixed(2)}deg`);
      a.style.setProperty('--ry', `${(x * 8).toFixed(2)}deg`);
      a.style.setProperty('--mx', `${((x + 0.5) * 100).toFixed(1)}%`);
      a.style.setProperty('--my', `${((y + 0.5) * 100).toFixed(1)}%`);
    });
    a.addEventListener('pointerleave', () => {
      a.style.setProperty('--rx', '0deg');
      a.style.setProperty('--ry', '0deg');
    });
  }
  a.addEventListener('click', (e) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.button) return;
    e.preventDefault();
    a.classList.add('launch');
    document.body.classList.add('leaving');
    setTimeout(() => (location.href = a.href), reduce ? 0 : 900);
  });
});

addEventListener('pageshow', () => {
  document.body.classList.remove('leaving');
  grid.querySelectorAll('.launch').forEach((a) => a.classList.remove('launch'));
});

const cv = document.getElementById('sky');
const ctx = cv.getContext('2d');
let W, H, stars;

const resize = () => {
  const dpr = Math.min(devicePixelRatio || 1, 2);
  W = innerWidth;
  H = innerHeight;
  cv.width = W * dpr;
  cv.height = H * dpr;
  ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
  stars = Array.from({ length: Math.round((W * H) / 2600) }, () => ({
    x: Math.random() * W,
    y: Math.random() * H,
    r: Math.random() ** 3 * 1.4 + 0.25,
    a: Math.random() * 0.6 + 0.2,
    p: Math.random() * Math.PI * 2,
    s: Math.random() * 0.8 + 0.3,
    warm: Math.random() < 0.18,
  }));
};

let px = 0,
  py = 0,
  tx = 0,
  ty = 0;
addEventListener('pointermove', (e) => {
  tx = e.clientX / W - 0.5;
  ty = e.clientY / H - 0.5;
});

const draw = (t) => {
  px += (tx - px) * 0.04;
  py += (ty - py) * 0.04;
  ctx.clearRect(0, 0, W, H);
  for (const s of stars) {
    const tw = reduce ? 1 : 0.65 + 0.35 * Math.sin(t * 0.001 * s.s + s.p);
    const x = (s.x - px * s.r * 14 + W) % W;
    const y = (s.y - py * s.r * 14 + H) % H;
    ctx.globalAlpha = s.a * tw;
    ctx.fillStyle = s.warm ? '#f2c4cc' : '#fbefe6';
    ctx.beginPath();
    ctx.arc(x, y, s.r, 0, Math.PI * 2);
    ctx.fill();
  }
  ctx.globalAlpha = 1;
  if (!reduce) requestAnimationFrame(draw);
};

resize();
addEventListener('resize', () => {
  resize();
  if (reduce) draw(0);
});
requestAnimationFrame(draw);
