const Lobby = (() => {
  const q = new URLSearchParams(location.search);
  let role = null;
  let peerRole = null;
  let onStart = null;
  let progress = save.get().progress || null;

  const step = (id) => {
    ['stepStart', 'stepRole', 'stepWait', 'stepReady'].forEach((s) => ($(s).hidden = s !== id));
  };
  const err = (m) => {
    $('lobbyErr').hidden = !m;
    $('lobbyErr').textContent = m || '';
  };
  const other = (r) => (r === 'yoline' ? 'william' : 'yoline');
  // old links and test URLs still say dame / valet
  const ident = (r) => ({ dame: 'yoline', valet: 'william' })[r] || r;

  const ready = () => {
    step('stepReady');
    $('readyText').textContent = `Connecté·e·s · tu joues ${CONFIG.players[role].name}`;
    if (Net.isHost && progress) {
      const ph = typeof progress === 'object' ? progress.phase : progress;
      let ch = typeof progress === 'object' ? progress.chapter : progress === 'free' ? 1 : 0;
      if (typeof progress === 'object' && !(progress.v >= 2)) ch = [0, 1, 3, 5, 6][ch] ?? 8;
      const nDone = typeof progress === 'object' && progress.v >= 4 ? (progress.done || []).length : -1;
      const tr = typeof Trials !== 'undefined' && Trials.byPhase[ph];
      const where = tr
        ? 'à ' + Cards.tag(tr.card) + ' · ' + tr.title
        : ph === 'city' && nDone >= 0
          ? 'après ' + nDone + (nDone > 1 ? ' épreuves' : ' épreuve')
          : ph === 'final'
          ? 'avant le Oui'
          : ph === 'act5'
            ? 'aux Deux mondes'
            : ph === 'act3'
              ? 'à l’Heure dorée'
              : // saves from before the plan: chapters in a fixed order
                ch === 0
                ? 'après les retrouvailles'
                : (typeof Trials !== 'undefined' &&
                    Trials.fromChapter(ch).length === ch &&
                    'après ' + Cards.tag(Trials.byId[Trials.fromChapter(ch)[ch - 1]].card)) ||
                  'en ville';
      $('resumeText').innerHTML = Icons.glyphs(
        'Partie sauvegardée : ' +
          where +
          '. <a href="#" id="restart" style="color:inherit">Recommencer du début</a>',
      );
    }
    const rs = $('restart');
    if (rs)
      rs.onclick = (e) => {
        e.preventDefault();
        save.set({ progress: null });
        progress = null;
        $('resumeText').textContent = 'La partie recommencera depuis le début.';
      };
  };

  const hello = () => Net.send('hello', { role });

  Net.on('hello', (d) => {
    peerRole = ident(d.role);
    if (!role) {
      role = other(peerRole);
      ready();
    } else if (peerRole === role && Net.isHost) Net.send('hello', { role });
  });
  Net.on('state', (t) => {
    if (Net.connected) return;
    if (Net.isHost) $('waitText').textContent = t;
    else $('readyText').textContent = t;
  });
  Net.on('disconnect', () => {
    if (!$('lobby').hidden)
      $('waitText').textContent = 'Connexion perdue, on attend l’autre joueur…';
  });
  Net.on('connect', () => {
    hello();
    if (role) ready();
    $('waitText').textContent = 'Connecté·e·s !';
  });

  // microphone choice: filled once the browser gives device labels (after permission)
  let micStream = null;
  const fillMics = async () => {
    if (!navigator.mediaDevices || !navigator.mediaDevices.enumerateDevices) return;
    const list = (await navigator.mediaDevices.enumerateDevices()).filter(
      (d) => d.kind === 'audioinput',
    );
    ['optMic', 'optMic2'].forEach((id) => {
      const sel = $(id);
      if (!sel) return;
      sel.innerHTML = '';
      list.forEach((d, i) => {
        const o = document.createElement('option');
        o.value = d.deviceId;
        o.textContent = d.label || 'Micro ' + (i + 1);
        sel.appendChild(o);
      });
      if (SETTINGS.mic && list.some((d) => d.deviceId === SETTINGS.mic)) sel.value = SETTINGS.mic;
      sel.closest('.opt').hidden = list.length < 2 && !micStream;
    });
  };
  const openMic = () =>
    navigator.mediaDevices.getUserMedia({
      audio: {
        deviceId: SETTINGS.mic ? { exact: SETTINGS.mic } : undefined,
        echoCancellation: true,
        noiseSuppression: true,
        autoGainControl: true,
      },
    });
  const switchMic = async (id) => {
    SETTINGS.mic = id;
    saveSettings();
    ['optMic', 'optMic2'].forEach((k) => $(k) && ($(k).value = id));
    if (!micStream) return;
    try {
      const s = await openMic();
      micStream.getTracks().forEach((t) => t.stop());
      micStream = s;
      Net.voice(s);
    } catch (e) {}
  };
  ['optMic', 'optMic2'].forEach(
    (id) => $(id) && ($(id).onchange = (e) => switchMic(e.target.value)),
  );
  if (navigator.mediaDevices && navigator.mediaDevices.addEventListener)
    navigator.mediaDevices.addEventListener('devicechange', fillMics);

  const mic = async (btn) => {
    try {
      Sound.init();
      let s;
      try {
        s = await openMic();
      } catch (e) {
        // the saved device is gone: fall back to the default one
        SETTINGS.mic = '';
        s = await openMic();
      }
      micStream = s;
      Net.voice(s);
      fillMics();
      ['btnMic', 'btnMic2'].forEach((id) => {
        $(id).classList.add('on');
        $(id).lastElementChild.textContent = 'Micro activé';
        $(id).disabled = true;
      });
    } catch (e) {
      btn.lastElementChild.textContent = 'Micro refusé';
    }
  };
  Net.on('stream', (s) => Sound.attachVoice(s));

  $('btnHost').onclick = () => {
    Sound.init();
    step('stepRole');
  };
  document.querySelectorAll('.role').forEach((b) => {
    b.onclick = async () => {
      role = b.dataset.role;
      Sound.play('ui');
      step('stepWait');
      $('linkInput').value = 'Création de la partie…';
      try {
        const code = await Net.host();
        const url = new URL(location.href);
        url.search = '?r=' + code;
        url.hash = '';
        $('linkInput').value = url.href;
      } catch (e) {
        err(e.message);
      }
    };
  });
  $('btnCopy').onclick = async () => {
    try {
      await navigator.clipboard.writeText($('linkInput').value);
      $('btnCopy').lastElementChild.textContent = 'Copié';
    } catch (e) {
      $('linkInput').select();
    }
  };
  $('btnMic').onclick = () => mic($('btnMic'));
  $('btnMic2').onclick = () => mic($('btnMic2'));
  $('btnPlay').onclick = () => {
    Sound.init();
    $('lobby').hidden = true;
    onStart && onStart(role, Net.isHost ? progress : null);
  };

  return {
    start(cb) {
      onStart = cb;
      const r = q.get('r');
      const lc = q.get('local');
      // ?stand: the solo firing range (js/levels/stand.js), no partner, no lobby
      // ?go=<phase> (city, tr_s1…): straight into a place, solo, to look at it
      if (q.has('stand') || q.get('go')) {
        role = 'yoline';
        Net.local('stand' + Math.random().toString(36).slice(2, 7), true);
        const go = () => {
          $('lobby').hidden = true;
          Sound.init();
          onStart(role, null);
          setTimeout(() => Story.goto(q.get('go') || 'stand'), 600);
        };
        if (q.get('go')) go();
        else {
          const s = document.createElement('script');
          s.src = 'js/levels/stand.js';
          s.onload = go;
          document.head.appendChild(s);
        }
        return;
      }
      if (lc) {
        role = ident(q.get('role') || (q.get('host') ? 'yoline' : 'william'));
        Net.local(lc, !!q.get('host'));
        step('stepWait');
        $('linkInput').value =
          'Test local : ouvre un 2e onglet avec ?local=' + lc + '&role=' + other(role);
        if (q.get('auto')) setTimeout(() => $('btnPlay').click(), 300);
        return;
      }
      if (r) {
        step(null);
        $('readyText').textContent = 'Connexion…';
        $('stepReady').hidden = false;
        $('btnPlay').hidden = true;
        Net.join(r)
          .then(() => {
            $('btnPlay').hidden = false;
          })
          .catch((e) => {
            $('readyText').textContent = 'Connexion impossible';
            err(e.message);
            $('btnPlay').hidden = false;
            $('btnPlay').textContent = 'Réessayer';
            $('btnPlay').onclick = () => location.reload();
          });
      }
    },
  };
})();
