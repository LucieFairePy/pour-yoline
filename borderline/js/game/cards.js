// The 52 cards of the Oui (+ the Joker): the numbers (2 to 10, and the aces) of every suit, the
// faces (Valet, Dame, Roi), then the Joker. Every card comes from a step of an épreuve, the end of an
// épreuve, or a hiding place in the city. Host-authoritative: owned ids live in Story.S.cards.
const Cards = (() => {
  const T = CONFIG;
  const D = T.deck;
  const SUITS = [
    ['h', '♥'],
    ['s', '♠'],
    ['d', '♦'],
    ['c', '♣'],
  ];
  const SUIT = Object.fromEntries(SUITS);
  const NUMS = ['1', '2', '3', '4', '5', '6', '7', '8', '9', '10'];
  const FACES = ['V', 'D', 'R'];
  const RANKS = [...NUMS, ...FACES];
  const NAME = { 1: 'As', V: 'Valet', D: 'Dame', R: 'Roi' };
  const SUIT_NAME = { h: 'cœur', s: 'pique', d: 'carreau', c: 'trèfle' };
  const IDS = SUITS.flatMap(([s]) => RANKS.map((r) => s + r));
  const NUM_IDS = IDS.filter((id) => !FACES.includes(id.slice(1)));
  const FACE_IDS = IDS.filter((id) => FACES.includes(id.slice(1)));
  const ALL = [...IDS, 'J'];

  const parse = (id) =>
    id === 'J' ? { suit: '', s: '', rank: 'J' } : { s: id[0], suit: SUIT[id[0]], rank: id.slice(1) };
  const label = (id) => {
    const { suit, rank } = parse(id);
    return id === 'J' ? 'Joker' : (rank === '1' ? 'A' : rank) + ' ' + suit;
  };
  const longName = (id) => {
    const { s, rank } = parse(id);
    if (id === 'J') return 'Le Joker';
    const r = NAME[rank] || rank;
    return (rank === 'D' ? 'Dame' : r) + ' de ' + SUIT_NAME[s];
  };
  // the way the épreuves write a card: suit first ('♠ 7', '♥ A')
  const tag = (id) => {
    const { suit, rank } = parse(id);
    return id === 'J' ? 'Joker' : suit + ' ' + (rank === '1' ? 'A' : rank);
  };
  // an épreuve shows its own card from js/game/trials.js, so a new deal never leaves a stale label
  const cardOf = (trialId) => Trials.byId[trialId].card;
  const texOf = (id) => {
    const { suit, rank } = parse(id);
    return Tex.card(rank === '1' ? 'A' : rank, suit);
  };

  // ---------- where each card comes from ----------
  // one card per épreuve (js/game/trials.js); the story finale gives the four aces and the Joker:
  // ♦ A and ♠ A once both worlds are crossed, ♣ A for the jump, ♥ A (the Oui itself) at the end
  const crossed = (x) => ['converge', 'caught'].includes(x.stage);
  const STAGE = {
    act5: [
      ['d1', crossed],
      ['s1', crossed],
      ['c1', (x) => x.stage === 'caught'],
    ],
    final: [['h1', (x) => ['letter', 'visa'].includes(x.step)]],
    epilogue: [['J', (x) => x.step >= 1]],
  };
  const rewardOf = (trialId) => {
    const t = Trials.byId[trialId];
    return t ? [t.card] : [];
  };
  // where to find a card, computed late: the épreuves register their phases after this file
  const hintOf = (id) => {
    const t = Trials.byCard[id];
    if (!t) {
      return D.where[Trials.storyPhaseOf(id)] || '';
    }
    const what = (t.face ? 'Figure ' : 'Épreuve ') + label(id) + ' · ' + t.title;
    return Trials.built(t) ? what : D.soon + ' · ' + what;
  };
  const CITY = [];
  const cityOf = {};

  const owned = () => (Story.S && Story.S.cards) || [];
  const has = (id) => owned().includes(id);
  const count = (list) => list.filter(has).length;
  // the faces open once every built number épreuve is done
  const numbersDone = () => !!Story.S && Trials.numbersLeft(Story.S.done || []).length === 0;

  // ---------- host ----------
  const award = (ctx, ids) => {
    const add = ids.filter((id) => ALL.includes(id) && !has(id));
    if (add.length) ctx.set((s) => (s.cards = [...(s.cards || []), ...add]));
  };
  const host = (ctx) => {
    const S = Story.S;
    const list = STAGE[S.phase];
    if (!list) return;
    const add = list.filter(([id, test]) => !has(id) && test(S.x || {})).map(([id]) => id);
    if (add.length) award(ctx, add);
  };
  const valid = () => false;

  // ---------- toasts ----------
  let known = null;
  const toastQ = [];
  let toastBusy = false;
  const runToast = async () => {
    if (toastBusy) return;
    toastBusy = true;
    const el = $('cardToast');
    if (!el) {
      toastQ.length = 0;
      toastBusy = false;
      return;
    }
    while (toastQ.length) {
      const id = toastQ.shift();
      try {
        $('ctImg').style.backgroundImage = `url(${dataUrl(id)})`;
        Icons.set($('ctName'), label(id));
        $('ctSub').textContent =
          id === 'J' ? D.toastJoker : count(ALL) + ' / 52 · ' + longName(id);
      } catch (e) {
        continue;
      }
      el.hidden = false;
      el.classList.remove('on');
      void el.offsetWidth;
      el.classList.add('on');
      Sound.play('card');
      await sleep(2600);
      el.classList.remove('on');
      await sleep(450);
    }
    el.hidden = true;
    toastBusy = false;
  };
  const sync = (S) => {
    const now = S.cards || [];
    if (known) {
      const fresh = now.filter((id) => !known.includes(id));
      // the reward screen already shows the big card
      const quiet = S.phase === 'reward' ? rewardOf(S.x.card) : [];
      const show = fresh.filter((id) => !quiet.includes(id));
      // a big batch (loaded save, test jump): one toast, not a minute of them
      if (show.length > 3) toastQ.push(show[show.length - 1]);
      else show.forEach((id) => toastQ.push(id));
      if (toastQ.length) runToast();
      const before = known.filter((id) => NUM_IDS.includes(id)).length;
      if (before < NUM_IDS.length && numbersDone()) setTimeout(figuresUnlocked, 3200);
    }
    known = now.slice();
    hudCount();
    if (menuOpen) renderMenu();
  };
  const figuresUnlocked = () => {
    Sound.play('reveal');
    HUD.say(D.figures, T.master, 4200);
    if (typeof BigScreen !== 'undefined') BigScreen.show('V · D · R', D.figuresTitle, '#ffcf8a');
  };
  const hudCount = () => {
    const el = $('hudCards');
    if (!el) return;
    const n = count(ALL);
    el.innerHTML = `${Icons.rich(D.hud)} · ${n}/52 <kbd>P</kbd>`;
  };

  // ---------- textures for the DOM ----------
  const urls = {};
  const dataUrl = (id) => urls[id] || (urls[id] = texOf(id).image.toDataURL('image/webp', 0.9));
  let backUrl = null;
  let backTex = null;
  const backCanvas = () => {
    const W = 512;
    const H = 716;
    // drawn in a 512-wide layout, rendered at 1080 px wide (1080p minimum)
    const S = 1080 / W;
    const c = document.createElement('canvas');
    c.width = Math.round(W * S);
    c.height = Math.round(H * S);
    const g = c.getContext('2d');
    g.scale(S, S);
    const rr = (x, y, w, h, r) => {
      g.beginPath();
      g.moveTo(x + r, y);
      g.arcTo(x + w, y, x + w, y + h, r);
      g.arcTo(x + w, y + h, x, y + h, r);
      g.arcTo(x, y + h, x, y, r);
      g.arcTo(x, y, x + w, y, r);
      g.closePath();
    };
    rr(0, 0, W, H, 40);
    g.fillStyle = '#fbefe6';
    g.fill();
    rr(18, 18, W - 36, H - 36, 28);
    const bg = g.createLinearGradient(0, 0, 0, H);
    bg.addColorStop(0, '#1a0820');
    bg.addColorStop(1, '#0d0612');
    g.fillStyle = bg;
    g.fill();
    g.save();
    g.clip();
    // faint star field + the voyage heart
    const r = rng(5);
    for (let i = 0; i < 420; i++) {
      g.fillStyle = `rgba(255,${200 + r() * 55},${220 + r() * 35},${0.15 + r() * 0.5})`;
      g.fillRect(r() * W, r() * H, r() < 0.1 ? 2 : 1, r() < 0.1 ? 2 : 1);
    }
    Heart.paint(g, W / 2, H / 2, 380, { fill: 1, t: 1.3 });
    g.restore();
    g.strokeStyle = 'rgba(232,189,132,0.9)';
    g.lineWidth = 3;
    rr(32, 32, W - 64, H - 64, 20);
    g.stroke();
    g.fillStyle = 'rgba(232,189,132,0.9)';
    g.font = '600 26px "IBM Plex Mono", monospace';
    g.textAlign = 'center';
    g.fillText('BORDERLINE', W / 2, H - 60);
    return c;
  };
  const back = () => backUrl || (backUrl = backCanvas().toDataURL('image/webp', 0.9));
  const backTexture = () => {
    if (!backTex) {
      backTex = Life.keep(new THREE.CanvasTexture(backCanvas()));
      backTex.anisotropy = 8;
    }
    return backTex;
  };

  // ---------- deck menu (P) ----------
  let menuOpen = false;
  let heartT = 0;
  const renderMenu = () => {
    const S = Story.S;
    if (!S) return;
    const figOpen = numbersDone();
    const n = count(NUM_IDS);
    const f = count(FACE_IDS);
    const j = has('J') ? 1 : 0;
    $('deckCount').textContent = `${n + f + j} / 52`;
    $('deckNums').textContent = `${n} / 40`;
    $('deckFaces').textContent = figOpen ? `${f} / 12` : D.locked;
    $('deckJoker').textContent = j ? '1 / 1' : f >= 12 ? '0 / 1' : D.locked;
    $('deckSteps').querySelectorAll('li').forEach((li, i) => {
      li.classList.toggle('done', [n >= 40, f >= 12, j >= 1][i]);
      li.classList.toggle('now', [n < 40, n >= 40 && f < 12, f >= 12 && !j][i]);
    });
    const rows = SUITS.map(([s, suit]) => {
      const cells = RANKS.map((r) => {
        const id = s + r;
        const face = FACES.includes(r);
        const got = has(id);
        const lock = face && !figOpen;
        const img = got ? dataUrl(id) : back();
        const cls = ['dk', got ? 'got' : 'miss', face ? 'face' : '', lock ? 'lock' : '']
          .filter(Boolean)
          .join(' ');
        const hint = got ? longName(id) : lock ? D.lockedHint : hintOf(id);
        return `<li class="${cls}" title="${hint}"><i style="background-image:url(${img})"></i>${got ? '' : `<b><em>${lock ? Icons.svg('lock') : '?'}</em></b>`}<span>${r === '1' ? 'A' : r}</span></li>`;
      }).join('');
      return `<div class="dk-row ${Tex.isRed(suit) ? 'red' : 'black'}"><span class="dk-suit">${Icons.glyphs(suit)}</span><ul>${cells}</ul></div>`;
    }).join('');
    const jl = has('J');
    $('deckGrid').innerHTML = rows;
    $('deckJokerCard').innerHTML = `<li class="dk ${jl ? 'got' : 'miss lock'}"><i style="background-image:url(${jl ? dataUrl('J') : back()})"></i>${jl ? '' : `<b><em>${Icons.svg('lock')}</em></b>`}<span>J</span></li>`;
    $('deckNote').textContent = figOpen ? (f >= 12 ? D.jokerHint : D.facesNote) : D.numbersNote;
    // the next épreuves to play, in order (the ones still being built are only counted)
    const done = S.done || [];
    const nexts = Trials.list.filter((t) => Trials.built(t) && !done.includes(t.id)).slice(0, 4);
    const soon = Trials.list.filter((t) => !Trials.built(t)).length;
    $('deckWhere').innerHTML =
      nexts
        .map(
          (t, i) =>
            `<li><span>${i ? D.later : D.nextUp}</span><b>${Icons.rich(label(t.card) + ' · ' + t.title)}</b></li>`,
        )
        .join('') + (soon ? `<li><span>${D.soon}</span><b>${soon} ${D.soonN}</b></li>` : '');
    // the words of the heart, kept in the box in the order they came back
    const words = Lore.words(done);
    $('deckWordsTitle').textContent = D.words;
    $('deckWordsList').innerHTML = words.length
      ? words.map((w) => `<li title="${label(w.card)}">${Icons.rich(w.words)}</li>`).join('')
      : `<li class="empty">${Icons.rich(D.wordsEmpty)}</li>`;
    paintHeart();
  };
  const paintHeart = () => {
    const cv = $('deckHeart');
    if (!cv) return;
    const g = cv.getContext('2d');
    g.clearRect(0, 0, cv.width, cv.height);
    Heart.paint(g, cv.width / 2, cv.height / 2 + 6, cv.width * 0.86, {
      fill: count(ALL) / 52,
      t: heartT,
    });
  };
  const toggle = (v = !menuOpen) => {
    menuOpen = v;
    $('deck').hidden = !v;
    if (v) renderMenu();
  };

  // ---------- hidden cards in the city ----------
  const cityGroup = new THREE.Group();
  const spots = [];
  let built = false;
  const build = () => {
    if (built) return;
    built = true;
    R.scene.add(cityGroup);
    const geo = new THREE.PlaneGeometry(0.62, 0.87);
    const beamGeo = new THREE.CylinderGeometry(0.18, 0.5, 26, 12, 1, true).translate(0, 13, 0);
    CITY.forEach(([id, x, y, z]) => {
      const g = new THREE.Group();
      g.position.set(x, y, z);
      const front = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({ map: texOf(id), toneMapped: false, color: 0xcccccc }),
      );
      const backM = new THREE.Mesh(
        geo,
        new THREE.MeshBasicMaterial({ map: backTexture(), toneMapped: false, color: 0xcccccc }),
      );
      backM.rotation.y = Math.PI;
      const card = new THREE.Group();
      card.add(front, backM);
      card.position.y = 1.25;
      g.add(card);
      const beam = new THREE.Mesh(
        beamGeo,
        new THREE.MeshBasicMaterial({
          color: new THREE.Color('#ffcf8a').multiplyScalar(1.4),
          transparent: true,
          opacity: 0.16,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
          side: THREE.DoubleSide,
        }),
      );
      g.add(beam);
      const halo = new THREE.Mesh(
        new THREE.RingGeometry(0.5, 0.75, 40).rotateX(-Math.PI / 2),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color('#ffcf8a').multiplyScalar(1.6),
          transparent: true,
          opacity: 0.5,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          toneMapped: false,
        }),
      );
      halo.position.y = 0.04;
      g.add(halo);
      g.visible = false;
      cityGroup.add(g);
      spots.push({ id, g, card, beam, halo, pos: V3(x, y, z), sparkT: Math.random() });
    });
  };
  let pingT = 0;
  const updateCity = (dt, t, inCity) => {
    if (!built) build();
    cityGroup.visible = inCity;
    if (!inCity) return;
    const p = Player.body.p;
    const rp = Remote.has ? Remote.pos : null;
    let nearest = 1e9;
    spots.forEach((sp) => {
      const show = valid(sp.id) && !has(sp.id);
      sp.g.visible = show;
      if (!show) return;
      sp.card.rotation.y = t * 1.6 + sp.sparkT * 6;
      sp.card.position.y = 1.25 + Math.sin(t * 2 + sp.sparkT * 9) * 0.12;
      sp.beam.material.opacity = 0.12 + 0.06 * Math.sin(t * 3 + sp.sparkT * 5);
      sp.halo.scale.setScalar(1 + 0.15 * Math.sin(t * 2.4 + sp.sparkT * 7));
      if (Math.random() < dt * 3)
        Fx.burst(
          sp.pos.clone().add(V3(0, 1.25, 0)),
          '#ffcf8a',
          4,
          1.2,
          0.6,
          1.5,
        );
      const d = Math.hypot(p.x - sp.pos.x, p.y + 0.9 - sp.pos.y - 1, p.z - sp.pos.z);
      nearest = Math.min(nearest, d);
      const take = (q) =>
        Math.hypot(q.x - sp.pos.x, q.z - sp.pos.z) < 1.3 && Math.abs(q.y - sp.pos.y) < 1.9;
      if (take(p) || (Net.isHost && rp && take(rp))) {
        if (!sp.sent || t - sp.sent > 1.5) {
          sp.sent = t;
          Story.ctx.act({ a: 'card', id: sp.id });
        }
      }
    });
    // a soft chime that speeds up near a hidden card
    pingT -= dt;
    if (nearest < 30 && pingT <= 0) {
      pingT = 0.4 + (nearest / 30) * 2.2;
      Sound.play('chime');
    }
  };

  return {
    IDS: ALL,
    NUM_IDS,
    FACE_IDS,
    rewardOf,
    label,
    tag,
    cardOf,
    tagOf: (trialId) => tag(cardOf(trialId)),
    longName,
    texOf,
    dataUrl,
    back,
    backTexture,
    has,
    count,
    numbersDone,
    award,
    host,
    valid,
    sync,
    get open() {
      return menuOpen;
    },
    toggle,
    numbersLeft: () => (Story.S ? Trials.numbersLeft(Story.S.done || []).length : 0),
    update(dt, t) {
      if (Input.pressed('deck')) toggle();
      if (menuOpen) {
        heartT += dt;
        paintHeart();
      }
      updateCity(dt, t, !!Story.S && ['city', 'reward'].includes(Story.S.phase));
    },
  };
})();
