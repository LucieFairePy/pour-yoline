// Two links run side by side: a direct WebRTC data channel (PeerJS) and an MQTT relay over
// secure WebSockets. Messages go through the direct channel when it is open and through the
// relay otherwise, so players behind strict NATs (no TURN server) can still play.
//
// The relay publishes to two public brokers at once (measured: ~15 ms, no loss at 40 msg/s;
// broker.emqx.io drops most messages above ~10/s, so it is not used). Outgoing messages are
// batched at 20 Hz: "latest only" streams (positions, full state, enemies) keep their newest
// value, everything else is numbered, acknowledged and resent until the other side has it.
const Net = (() => {
  const PREFIX = 'brdl-yo-';
  const BROKERS = ['wss://broker.hivemq.com:8884/mqtt', 'wss://test.mosquitto.org:8081/mqtt'];
  const LATEST = new Set(['p', 'S', 'en', 'h']);
  const handlers = {};
  let peer = null;
  let conn = null;
  let bc = null;
  const me = Math.random().toString(36).slice(2, 10);
  let code = '';
  let isHost = false;
  let connected = false;
  let mode = 'p2p';
  let localStream = null;
  let retry = null;
  let p2pOpen = false;
  let rtt = 0;
  const BORN = Date.now();

  const emit = (t, d) => (handlers[t] || []).forEach((f) => f(d));
  const state = (s) => emit('state', s);
  const refresh = () => {
    const s = p2pOpen || RL.mate;
    const was = connected;
    connected = s;
    if (was !== s) emit(s ? 'connect' : 'disconnect');
  };

  // every message from the other side lands here
  const rx = (t, d) => {
    if (t === '__rtt') return send('__rtt2', d);
    if (t === '__rtt2') {
      rtt = Math.round(performance.now() - d);
      return;
    }
    emit(t, d);
  };

  const makeCode = () => {
    const A = 'abcdefghjkmnpqrstuvwxyz23456789';
    let s = '';
    for (let i = 0; i < 6; i++) s += A[(Math.random() * A.length) | 0];
    return s;
  };

  // ---- MQTT relay ----
  const RL = {
    clients: [],
    up: 0,
    mate: false,
    mateId: '',
    mateSt: 0,
    seen: 0,
    // outgoing
    seq: 0,
    pend: [],
    latest: new Map(),
    n: 0,
    hello: true,
    // incoming
    rxSeq: 0,
    rxN: 0,
    ackDue: false,
  };
  const topic = (from) => 'brdl-yo/v2/' + code + '/' + from;
  const relayQueue = (t, d) => {
    if (LATEST.has(t)) RL.latest.set(t, d);
    else {
      RL.pend.push([++RL.seq, t, d]);
      if (RL.pend.length > 400) RL.pend.splice(0, RL.pend.length - 400);
    }
  };
  const relayFlush = () => {
    if (!RL.up) return;
    const idle = !RL.pend.length && !RL.latest.size && !RL.ackDue && !RL.hello;
    if (idle) return;
    const pkt = { f: me, st: BORN, n: ++RL.n, a: RL.rxSeq };
    if (RL.hello) pkt.h = 1;
    if (RL.pend.length) pkt.r = RL.pend.slice(0, 60);
    if (RL.latest.size) {
      pkt.l = [...RL.latest];
      RL.latest.clear();
    }
    RL.ackDue = false;
    RL.hello = false;
    const body = JSON.stringify(pkt);
    for (const c of RL.clients)
      if (c.connected)
        try {
          c.publish(topic(isHost ? 'h' : 'g'), body, { qos: 0 });
        } catch (e) {}
  };
  const relayRx = (buf) => {
    let m;
    try {
      m = JSON.parse(buf.toString());
    } catch (e) {
      return;
    }
    if (!m || m.f === me) return;
    if (m.f !== RL.mateId) {
      // late packets from a page the other side already closed
      if (m.st < RL.mateSt) return;
      // a new page on the other side (reload): restart the sequences both ways
      const had = !!RL.mateId;
      RL.mateId = m.f;
      RL.mateSt = m.st;
      RL.rxSeq = 0;
      RL.rxN = 0;
      RL.seq = 0;
      RL.pend = [];
      RL.hello = true;
      if (had && RL.mate) emit('connect');
    }
    RL.seen = performance.now();
    if (!RL.mate) {
      RL.mate = true;
      refresh();
    }
    // acknowledged messages can go
    if (m.a) while (RL.pend.length && RL.pend[0][0] <= m.a) RL.pend.shift();
    if (m.r) {
      for (const [s, t, d] of m.r)
        if (s === RL.rxSeq + 1) {
          RL.rxSeq = s;
          rx(t, d);
        }
      RL.ackDue = true;
    }
    // packets arrive from both brokers: only the newest "latest" values count
    if (m.n > RL.rxN) {
      RL.rxN = m.n;
      if (m.l) for (const [t, d] of m.l) rx(t, d);
    }
  };
  const startRelay = () => {
    if (RL.clients.length || typeof mqtt === 'undefined' || !code) return;
    BROKERS.forEach((url, i) => {
      let c;
      try {
        c = mqtt.connect(url, {
          clientId: 'brdl_' + me + '_' + i,
          clean: true,
          connectTimeout: 8000,
          reconnectPeriod: 2000,
          keepalive: 20,
        });
      } catch (e) {
        return;
      }
      RL.clients.push(c);
      c.on('connect', () => {
        c.subscribe(topic(isHost ? 'g' : 'h'), { qos: 0 });
        RL.up = RL.clients.filter((k) => k.connected).length;
        RL.hello = true;
      });
      c.on('close', () => {
        RL.up = RL.clients.filter((k) => k.connected).length;
      });
      c.on('error', () => {});
      c.on('message', (tp, buf) => relayRx(buf));
    });
  };
  const stopRelay = () => {
    RL.clients.forEach((c) => c.end(true));
    RL.clients = [];
    RL.up = 0;
  };
  setInterval(relayFlush, 50);
  // keepalive, round-trip time and the other side going away
  setInterval(() => {
    if (connected) send('__rtt', performance.now());
    if (RL.up) RL.ackDue = true;
    if (RL.mate && performance.now() - RL.seen > 9000) {
      RL.mate = false;
      refresh();
    }
  }, 2000);

  // ---- PeerJS direct link ----
  const bind = (c) => {
    conn = c;
    c.on('open', () => {
      p2pOpen = true;
      refresh();
      state('Connexion directe établie');
      if (localStream && isHost) call(localStream);
    });
    c.on('data', (m) => m && m.t && rx(m.t, m.d));
    c.on('close', () => {
      if (conn === c) {
        conn = null;
        p2pOpen = false;
        refresh();
        if (!isHost) scheduleRetry();
      }
    });
    c.on('error', () => {});
  };

  const scheduleRetry = () => {
    clearTimeout(retry);
    retry = setTimeout(() => {
      if (p2pOpen || !peer || peer.destroyed) return;
      if (peer.disconnected) peer.reconnect();
      if (!peer.disconnected)
        bind(peer.connect(PREFIX + code, { reliable: true, serialization: 'json' }));
      scheduleRetry();
    }, 6000);
  };

  const listenCalls = () => {
    peer.on('call', (c) => {
      c.answer(localStream || undefined);
      if (localStream) outCall = c;
      c.on('stream', (s) => emit('stream', s));
    });
  };

  let outCall = null;
  const call = (stream) => {
    if (!peer || !conn || !p2pOpen) return;
    // already talking: swap the track instead of opening a second call
    const pc = outCall && outCall.open && outCall.peerConnection;
    const track = stream.getAudioTracks()[0];
    if (pc && track) {
      const snd = pc.getSenders().find((x) => x.track && x.track.kind === 'audio');
      if (snd) {
        snd.replaceTrack(track);
        return;
      }
    }
    const c = peer.call(conn.peer, stream);
    if (c) {
      outCall = c;
      c.on('stream', (s) => emit('stream', s));
    }
  };

  const newPeer = (id) =>
    new Peer(id, {
      debug: 0,
      config: {
        iceServers: [
          { urls: 'stun:stun.l.google.com:19302' },
          { urls: 'stun:stun1.l.google.com:19302' },
          { urls: 'stun:global.stun.twilio.com:3478' },
          {
            urls: ['turn:eu-0.turn.peerjs.com:3478', 'turn:us-0.turn.peerjs.com:3478'],
            username: 'peerjs',
            credential: 'peerjsp',
          },
        ],
      },
    });

  const send = (t, d) => {
    if (bc) bc.postMessage({ from: me, t, d });
    else if (p2pOpen && conn && conn.open) {
      try {
        conn.send({ t, d });
      } catch (e) {
        relayQueue(t, d);
      }
    } else if (RL.up) relayQueue(t, d);
  };

  // ?relay forces the relay only (for testing strict networks)
  const noP2P = new URLSearchParams(location.search).has('relay');
  const libs = () => typeof Peer !== 'undefined' || typeof mqtt !== 'undefined';

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
    get via() {
      return p2pOpen ? (bc ? 'local' : 'direct') : RL.mate ? 'relais' : '';
    },
    get rtt() {
      return rtt;
    },
    host() {
      isHost = true;
      return new Promise((res, rej) => {
        if (!libs())
          return rej(new Error('Réseau indisponible (scripts bloqués ?). Recharge la page.'));
        let done = false;
        const ok = () => {
          if (done) return;
          done = true;
          save.set({ room: code });
          res(code);
        };
        code = save.get().room || makeCode();
        startRelay();
        if (typeof mqtt !== 'undefined') {
          // the relay alone is enough to share a link
          const wait = setInterval(() => {
            if (RL.up) {
              clearInterval(wait);
              ok();
            }
          }, 200);
          setTimeout(() => clearInterval(wait), 30000);
        }
        if (typeof Peer === 'undefined' || noP2P) return;
        const attempt = (n) => {
          peer = newPeer(PREFIX + code);
          peer.on('open', ok);
          peer.on('connection', (c) => {
            const old = conn;
            bind(c);
            if (old && old !== c) {
              try {
                old.close();
              } catch (e) {}
            }
          });
          peer.on(
            'disconnected',
            () => !peer.destroyed && setTimeout(() => peer.reconnect(), 1500),
          );
          peer.on('error', (e) => {
            if (e.type !== 'unavailable-id') return;
            peer.destroy();
            if (typeof mqtt !== 'undefined' && n < 8) {
              // probably our own previous session still registered: keep the shared link
              // working through the relay and claim the id again shortly
              setTimeout(() => attempt(n + 1), 5000);
            } else if (n < 4 && !done) {
              // the code is taken on PeerJS: pick a new one for both links
              stopRelay();
              code = makeCode();
              startRelay();
              attempt(n + 1);
            }
          });
          listenCalls();
        };
        attempt(0);
        setTimeout(
          () => !done && rej(new Error('Impossible de joindre les serveurs de connexion.')),
          30000,
        );
      });
    },
    join(c) {
      isHost = false;
      code = c;
      return new Promise((res, rej) => {
        if (!libs())
          return rej(new Error('Réseau indisponible (scripts bloqués ?). Recharge la page.'));
        let done = false;
        let lastErr = '';
        const off = () => {
          if (done) return;
          done = true;
          res();
        };
        handlers.connect = handlers.connect || [];
        handlers.connect.unshift(off);
        state('Recherche de la partie…');
        startRelay();
        if (typeof Peer !== 'undefined' && !noP2P) {
          peer = newPeer();
          peer.on('open', () => {
            state('Partie trouvée, connexion…');
            bind(peer.connect(PREFIX + code, { reliable: true, serialization: 'json' }));
            scheduleRetry();
          });
          peer.on('error', (e) => {
            lastErr = e.type;
          });
          peer.on(
            'disconnected',
            () => !peer.destroyed && setTimeout(() => peer.reconnect(), 1500),
          );
          listenCalls();
        }
        setTimeout(() => {
          if (done) return;
          rej(
            new Error(
              lastErr === 'peer-unavailable'
                ? 'Partie introuvable : l’autre joueur doit garder la page de la partie ouverte.'
                : 'La connexion prend trop de temps. Vérifie que l’autre joueur a toujours la page ouverte, puis réessaie.',
            ),
          );
        }, 30000);
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
          p2pOpen = true;
          refresh();
          return;
        }
        rx(m.t, m.d);
      };
      bc.postMessage({ from: me, t: '__hi' });
      return Promise.resolve(c);
    },
    send,
    voice(stream) {
      localStream = stream;
      if (connected) call(stream);
    },
  };
})();
