const Net = (() => {
  const PREFIX = 'brdl-yo-';
  const handlers = {};
  let peer = null;
  let conn = null;
  let bc = null;
  let me = Math.random().toString(36).slice(2, 10);
  let code = '';
  let isHost = false;
  let connected = false;
  let mode = 'p2p';
  let localStream = null;
  let retry = null;

  const emit = (t, d) => (handlers[t] || []).forEach((f) => f(d));
  const status = (s) => {
    const was = connected;
    connected = s;
    if (was !== s) emit(s ? 'connect' : 'disconnect');
  };

  const makeCode = () => {
    const A = 'abcdefghjkmnpqrstuvwxyz23456789';
    let s = '';
    for (let i = 0; i < 6; i++) s += A[(Math.random() * A.length) | 0];
    return s;
  };

  const bind = (c) => {
    conn = c;
    c.on('open', () => {
      status(true);
      if (localStream && isHost) call(localStream);
    });
    c.on('data', (m) => m && m.t && emit(m.t, m.d));
    c.on('close', () => {
      if (conn === c) {
        conn = null;
        status(false);
        if (!isHost) scheduleRetry();
      }
    });
    c.on('error', () => {});
  };

  const scheduleRetry = () => {
    clearTimeout(retry);
    retry = setTimeout(() => {
      if (connected || !peer || peer.destroyed) return;
      if (peer.disconnected) peer.reconnect();
      bind(peer.connect(PREFIX + code, { reliable: true, serialization: 'json' }));
      scheduleRetry();
    }, 3000);
  };

  const listenCalls = () => {
    peer.on('call', (c) => {
      c.answer(localStream || undefined);
      c.on('stream', (s) => emit('stream', s));
    });
  };

  const call = (stream) => {
    if (!peer || !conn) return;
    const c = peer.call(conn.peer, stream);
    if (c) c.on('stream', (s) => emit('stream', s));
  };

  const newPeer = (id) =>
    new Peer(id, {
      debug: 0,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' },
        ],
      },
    });

  return {
    on(t, f) {
      (handlers[t] = handlers[t] || []).push(f);
    },
    get isHost() {
      return isHost;
    },
    get connected() {
      return connected;
    },
    get code() {
      return code;
    },
    get mode() {
      return mode;
    },
    host() {
      isHost = true;
      return new Promise((res, rej) => {
        if (typeof Peer === 'undefined') return rej(new Error('Réseau indisponible.'));
        const attempt = (n) => {
          const kept = n === 0 && save.get().room;
          code = kept || makeCode();
          peer = newPeer(PREFIX + code);
          peer.on('open', () => {
            save.set({ room: code });
            res(code);
          });
          peer.on('connection', (c) => {
            const old = conn;
            bind(c);
            if (old && old !== c) {
              try {
                old.close();
              } catch (e) {}
            }
          });
          peer.on('disconnected', () => !peer.destroyed && peer.reconnect());
          peer.on('error', (e) => {
            if (e.type === 'unavailable-id' && n < 4) {
              peer.destroy();
              attempt(n + 1);
            } else if (!code || e.type === 'network' || e.type === 'server-error') {
              rej(new Error('Impossible de joindre le serveur de connexion.'));
            }
          });
          listenCalls();
        };
        attempt(0);
      });
    },
    join(c) {
      isHost = false;
      code = c;
      return new Promise((res, rej) => {
        if (typeof Peer === 'undefined') return rej(new Error('Réseau indisponible.'));
        peer = newPeer();
        let done = false;
        peer.on('open', () => {
          bind(peer.connect(PREFIX + code, { reliable: true, serialization: 'json' }));
          const off = () => {
            if (!done) {
              done = true;
              res();
            }
          };
          handlers.connect = handlers.connect || [];
          handlers.connect.unshift(off);
        });
        peer.on('error', (e) => {
          if (done) return;
          if (e.type === 'peer-unavailable')
            rej(new Error('Partie introuvable. Le lien est peut-être expiré.'));
          else rej(new Error('Connexion impossible (' + e.type + ').'));
        });
        peer.on('disconnected', () => !peer.destroyed && peer.reconnect());
        listenCalls();
        setTimeout(() => !done && rej(new Error('La connexion prend trop de temps.')), 20000);
      });
    },
    local(c, host) {
      mode = 'local';
      isHost = host;
      code = c;
      bc = new BroadcastChannel(PREFIX + c);
      bc.onmessage = (e) => {
        const m = e.data;
        if (!m || m.from === me) return;
        if (m.t === '__hi' || m.t === '__ack') {
          if (m.t === '__hi') bc.postMessage({ from: me, t: '__ack' });
          if (connected && m.t === '__hi') emit('connect');
          status(true);
          return;
        }
        emit(m.t, m.d);
      };
      bc.postMessage({ from: me, t: '__hi' });
      return Promise.resolve(c);
    },
    send(t, d) {
      if (bc) bc.postMessage({ from: me, t, d });
      else if (conn && conn.open) {
        try {
          conn.send({ t, d });
        } catch (e) {}
      }
    },
    voice(stream) {
      localStream = stream;
      if (connected) call(stream);
    },
  };
})();
