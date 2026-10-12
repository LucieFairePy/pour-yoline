const HUD = (() => {
  const el = {
    root: $('hud'),
    obj: $('objective'),
    objText: $('objText'),
    prompt: $('prompt'),
    pKey: $('promptKey'),
    pText: $('promptText'),
    sub: $('subtitle'),
    subWho: $('subWho'),
    subText: $('subText'),
    partner: $('partner'),
    pDist: $('partnerDist'),
    status: $('status'),
    cross: $('crosshair'),
    vign: $('vign'),
    visa: $('hudVisa'),
    suit: $('hudSuit'),
  };
  const queue = [];
  let typing = null;
  let lastObj = '';
  let lastPrompt = '';
  const proj = V3();

  const runQueue = async () => {
    if (typing) return;
    while (queue.length) {
      const { who, text, hold } = queue.shift();
      typing = true;
      el.sub.hidden = false;
      el.subWho.textContent = who || '';
      el.subText.textContent = '';
      for (let i = 1; i <= text.length; i++) {
        el.subText.textContent = text.slice(0, i);
        await sleep(text[i - 1] === ' ' ? 18 : 28);
      }
      await sleep(hold || 1600 + text.length * 35);
    }
    el.sub.hidden = true;
    typing = null;
  };

  return {
    show(v) {
      el.root.hidden = !v;
    },
    role(r) {
      el.suit.textContent = CONFIG.roles[r].suit;
    },
    objective(t) {
      if (t === lastObj) return;
      lastObj = t;
      el.obj.classList.add('off');
      setTimeout(() => {
        el.objText.textContent = t || '';
        el.obj.classList.toggle('off', !t);
      }, 300);
    },
    say(text, who = CONFIG.master, hold) {
      queue.push({ who, text, hold });
      runQueue();
    },
    get talking() {
      return !!typing || queue.length > 0;
    },
    prompt(key, text, hold) {
      const k = key ? key + text + hold : '';
      if (k === lastPrompt) return;
      lastPrompt = k;
      el.prompt.hidden = !key;
      if (!key) return;
      el.pKey.textContent = Input.pad ? { E: 'X', F: 'RB', C: 'Y', Espace: 'A' }[key] || key : key;
      el.pText.textContent = text;
      el.prompt.classList.toggle('hold', !!hold);
    },
    visa(t) {
      el.visa.textContent = t;
    },
    status(t) {
      el.status.innerHTML = t;
    },
    crosshair(on, lock) {
      el.cross.classList.toggle('on', on);
      el.cross.classList.toggle('lock', !!lock);
    },
    danger(v) {
      el.vign.style.opacity = v;
    },
    partner(pos, cam, show, label) {
      if (!show) {
        el.partner.classList.remove('on');
        return;
      }
      proj.copy(pos);
      proj.y += 2.3;
      proj.project(cam);
      const behind = proj.z > 1;
      let x = proj.x;
      let y = proj.y;
      if (behind) {
        x = -x;
        y = -Math.abs(y) - 0.2;
      }
      const m = Math.max(Math.abs(x), Math.abs(y));
      const off = behind || m > 0.92;
      if (off) {
        x = (x / m) * 0.9;
        y = (y / m) * 0.86;
      }
      const sx = ((x + 1) / 2) * innerWidth;
      const sy = ((1 - y) / 2) * innerHeight;
      el.partner.style.left = sx + 'px';
      el.partner.style.top = sy + 'px';
      const arrow = el.partner.firstElementChild;
      arrow.style.transform = off ? `rotate(${Math.atan2(x, y)}rad)` : 'rotate(180deg)';
      el.pDist.textContent = label;
      el.partner.classList.add('on');
    },
    card(corner, big, title, sub) {
      $('cardCorner').textContent = corner;
      $('cardCorner2').textContent = corner;
      $('cardBig').textContent = big;
      $('cardTitle').textContent = title;
      $('cardSub').textContent = sub;
      const c = $('card');
      c.hidden = false;
      c.querySelectorAll('.card-face,.card-title,.card-sub').forEach((n) => {
        n.style.animation = 'none';
        void n.offsetWidth;
        n.style.animation = '';
      });
    },
    hideCard() {
      $('card').hidden = true;
    },
    memory(tag, title, text) {
      return new Promise((res) => {
        $('memTag').textContent = tag;
        $('memTitle').textContent = title;
        $('memText').textContent = text;
        $('memory').hidden = false;
        Input.unlock();
        Input.enabled = false;
        const close = () => {
          $('memory').hidden = true;
          $('memClose').removeEventListener('click', close);
          Input.enabled = true;
          Input.lock();
          res();
        };
        $('memClose').addEventListener('click', close);
      });
    },
  };
})();
