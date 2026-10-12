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
  const other = (r) => (r === 'dame' ? 'valet' : 'dame');

  const ready = () => {
    step('stepReady');
    $('readyText').textContent = `Connecté·e·s · tu joues ${CONFIG.roles[role].name}`;
    if (Net.isHost && progress) {
      const ph = typeof progress === 'object' ? progress.phase : progress;
      let ch = typeof progress === 'object' ? progress.chapter : progress === 'free' ? 1 : 0;
      if (typeof progress === 'object' && !(progress.v >= 2)) ch = [0, 1, 3, 5, 6][ch] ?? 8;
      const where =
        ph === 'final'
          ? 'avant la Dame de Cœur'
          : ph === 'act5'
            ? 'aux Deux mondes'
            : ph === 'act3'
              ? 'à l’Heure dorée'
              : {
                  soleil: 'à ♠ 3',
                  donjon: 'à ♠ 7',
                  garde: 'à ♠ R',
                  portes: 'à ♦ 9',
                  balade: 'à ♥ 2',
                  raid: 'à ♣ R',
                }[ph] ||
                [
                  'après les retrouvailles',
                  'après ♥ 10',
                  'après ♠ 3',
                  'après ♣ 4',
                  'après ♠ 7',
                  'après ♠ R',
                  'après ♦ 9',
                  'après ♥ 2',
                  'après ♣ R',
                ][ch] ||
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
    peerRole = d.role;
    if (!role) {
      role = other(d.role);
      ready();
    } else if (d.role === role && Net.isHost) Net.send('hello', { role });
  });
  Net.on('connect', () => {
    hello();
    if (role) ready();
    $('waitText').textContent = 'Connecté·e·s !';
  });

  const mic = async (btn) => {
    try {
      Sound.init();
      const s = await navigator.mediaDevices.getUserMedia({
        audio: { echoCancellation: true, noiseSuppression: true, autoGainControl: true },
      });
      Net.voice(s);
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
      if (lc) {
        role = q.get('role') || (q.get('host') ? 'dame' : 'valet');
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
            $('stepReady').hidden = true;
            step('stepStart');
            err(e.message);
          });
      }
    },
  };
})();
