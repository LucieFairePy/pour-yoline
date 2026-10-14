const HUD = (() => {
  // names and pronouns depend on who carries which kit this chapter
  const F = (s) => (typeof Story !== 'undefined' && Story.fmt ? Story.fmt(s) : s);
  const put = (el, t) => Icons.set(el, F(t));
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
    goal: $('goal'),
    goalDist: $('goalDist'),
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
  let lastClues = '';
  let letterDone = null;
  const proj = V3();

  const dismiss = (btn) =>
    new Promise((res) => {
      let done = false;
      const t0 = performance.now();
      const key = (e) => {
        if (['Enter', 'Space', 'KeyE', 'Escape'].includes(e.code)) {
          e.preventDefault();
          finish();
        }
      };
      const finish = () => {
        if (done) return;
        done = true;
        removeEventListener('keyup', key);
        btn.removeEventListener('click', finish);
        res();
      };
      const pad = () => {
        if (done) return;
        if (performance.now() - t0 > 700 && Input.rawPad([0, 2, 9])) finish();
        else requestAnimationFrame(pad);
      };
      btn.addEventListener('click', finish);
      setTimeout(() => !done && addEventListener('keyup', key), 700);
      requestAnimationFrame(pad);
    });

  const runQueue = async () => {
    if (typing) return;
    while (queue.length) {
      const { who, text, hold } = queue.shift();
      typing = true;
      el.sub.hidden = false;
      put(el.subWho, who || '');
      el.subText.textContent = '';
      const chars = Array.from(text);
      for (let i = 1; i <= chars.length; i++) {
        put(el.subText, chars.slice(0, i).join(''));
        await sleep(chars[i - 1] === ' ' ? 18 : 28);
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
      put(el.suit, CONFIG.roles[r].suit);
      el.suit.classList.toggle('black', r === 'valet');
    },
    objective(t) {
      if (t === lastObj) return;
      lastObj = t;
      el.obj.classList.add('off');
      setTimeout(() => {
        put(el.objText, t || '');
        el.obj.classList.toggle('off', !t);
      }, 300);
    },
    say(text, who = CONFIG.master, hold) {
      queue.push({ who: F(who), text: F(text), hold });
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
      put(el.pText, text);
      el.prompt.classList.toggle('hold', !!hold);
    },
    visa(t) {
      put(el.visa, t);
    },
    status(t) {
      el.status.innerHTML = Icons.glyphs(t);
    },
    crosshair(on, lock, ads) {
      el.cross.classList.toggle('on', on);
      el.cross.classList.toggle('lock', !!lock);
      el.cross.classList.toggle('ads', !!ads);
    },
    danger(v) {
      el.vign.style.opacity = v;
    },
    partner(pos, cam, show, label) {
      this.marker(el.partner, el.pDist, pos, cam, show, label, 2.3);
    },
    // where to go next in the city (the lit door or the memory): same marker, gold
    goal(pos, cam, show, label) {
      this.marker(el.goal, el.goalDist, pos, cam, show, label, 3);
    },
    marker(node, text, pos, cam, show, label, lift) {
      if (!show) {
        node.classList.remove('on');
        return;
      }
      proj.copy(pos);
      proj.y += lift;
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
      node.style.left = sx + 'px';
      node.style.top = sy + 'px';
      const arrow = node.firstElementChild;
      arrow.style.transform = off ? `rotate(${Math.atan2(x, y)}rad)` : 'rotate(180deg)';
      text.textContent = label;
      node.classList.add('on');
    },
    // a ping: the goal marker swells for a moment
    pingGoal() {
      el.goal.classList.remove('ping');
      void el.goal.offsetWidth;
      el.goal.classList.add('ping');
    },
    card(corner, big, title, sub) {
      put($('cardCorner'), corner);
      put($('cardCorner2'), corner);
      put($('cardBig'), big);
      // the real card face (same texture as in the world): black spades/clubs, red hearts/diamonds
      const face = $('card').querySelector('.card-face');
      const rank = String(corner).split(/\s/)[0];
      try {
        face.style.backgroundImage = `url(${Tex.card(rank, big).image.toDataURL()})`;
        face.classList.add('real');
      } catch (e) {
        face.classList.remove('real');
      }
      face.classList.toggle('black', !Tex.isRed(big));
      put($('cardTitle'), title);
      put($('cardSub'), sub);
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
    combat(on) {
      $('combat').hidden = !on;
      if (!on) $('bossbar').hidden = true;
      $('vMeName').textContent = Story.name(Story.role);
      $('vMateName').textContent = Story.name(Story.ctx.other);
      $('vAbil').hidden = Story.role !== 'valet';
    },
    vitals(me, mate, down, mateDown, revive, abil, cloaked) {
      $('vMe').style.transform = `scaleX(${clamp(me, 0, 1)})`;
      $('vMate').style.transform = `scaleX(${clamp(mate, 0, 1)})`;
      $('vMate').parentElement.classList.toggle('down', mateDown);
      $('vDown').hidden = !down;
      $('vRevive').style.opacity = revive > 0 ? 1 : 0;
      $('vReviveFill').style.transform = `scaleX(${clamp(revive, 0, 1)})`;
      if (abil >= 0) {
        $('vAbilFill').style.transform = `scaleY(${clamp(abil, 0, 1)})`;
        $('vAbil').classList.toggle('ready', abil >= 1);
        $('vAbil').classList.toggle('on', cloaked);
      }
    },
    boss(name, frac, phase) {
      const b = $('bossbar');
      if (name == null) {
        b.hidden = true;
        return;
      }
      b.hidden = false;
      put($('bossName'), name);
      $('bossFill').style.transform = `scaleX(${clamp(frac, 0, 1)})`;
      put($('bossPhase'), phase || '');
    },
    hurt() {
      const h = $('hurt');
      h.style.transition = 'none';
      h.style.opacity = 0.7;
      void h.offsetWidth;
      h.style.transition = 'opacity 0.6s';
      h.style.opacity = 0;
    },
    hitmark(weak) {
      const h = $('hitmark');
      h.className = 'hitmark on' + (weak ? ' weak' : '');
      clearTimeout(h.t);
      h.t = setTimeout(() => (h.className = 'hitmark'), 120);
    },
    clues(n, total) {
      const k = n + '/' + total;
      if (k === lastClues) return;
      lastClues = k;
      $('hudClues').textContent = n ? 'Cassettes · ' + k : '';
    },
    manual(spec) {
      const m = $('manual');
      if (!spec) {
        m.hidden = true;
        return;
      }
      put($('manTitle'), spec.title);
      put($('manIntro'), spec.intro);
      $('manRules').innerHTML = spec.rules
        .map(
          ([s, r]) =>
            `<li><span class="sym">${Icons.glyphs(s)}</span><span>${Icons.glyphs(r)}</span></li>`,
        )
        .join('');
      put($('manOutro'), spec.outro);
      m.hidden = false;
    },
    closeLetter() {
      if (letterDone) letterDone();
    },
    letter(lines, sig) {
      return new Promise(async (res) => {
        let over = false;
        letterDone = () => {
          over = true;
          $('letter').hidden = true;
          letterDone = null;
          res();
        };
        const box = $('letterLines');
        box.innerHTML = '';
        $('letterSig').textContent = '';
        $('letterBtn').hidden = true;
        $('letter').hidden = false;
        Input.unlock();
        for (const [suit, text] of lines) {
          if (over) return;
          const li = document.createElement('p');
          li.innerHTML = `<span class="suit">${Icons.rich(suit)}</span><span class="txt"></span>`;
          box.appendChild(li);
          const t = li.querySelector('.txt');
          for (let i = 1; i <= text.length; i++) {
            t.textContent = text.slice(0, i);
            await sleep(32);
          }
          await sleep(700);
        }
        put($('letterSig'), sig);
        $('letterBtn').hidden = false;
        await dismiss($('letterBtn'));
        if (over) return;
        Input.lock();
        letterDone && letterDone();
      });
    },
    credits(lines, note) {
      const box = $('creditsRoll');
      box.innerHTML = lines.map(([k, v]) => `<p class="${k}">${Icons.glyphs(v)}</p>`).join('');
      $('creditsNote').textContent = note || '';
      $('credits').hidden = false;
      Input.unlock();
      $('btnReplay').onclick = () => {
        save.set({ progress: null });
        location.href = location.pathname;
      };
    },
    memory(tag, title, text) {
      return new Promise((res) => {
        put($('memTag'), tag);
        put($('memTitle'), title);
        put($('memText'), text);
        $('memory').hidden = false;
        Input.unlock();
        Input.enabled = false;
        dismiss($('memClose')).then(() => {
          $('memory').hidden = true;
          Input.enabled = true;
          Input.lock();
          res();
        });
      });
    },
  };
})();
