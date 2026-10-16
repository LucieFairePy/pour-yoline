// Two links run side by side: a direct WebRTC data channel (PeerJS) and an MQTT relay over
// secure WebSockets. Messages go through the direct channel when it is open and through the
// relay otherwise, so players behind strict NATs (no TURN server) can still play.
//
// The relay publishes to two public brokers at once (measured: ~15 ms, no loss at 40 msg/s;
// broker.emqx.io drops most messages above ~10/s, so it is not used). Outgoing messages are
// batched at 20 Hz: "latest only" streams (full state, enemies) keep their newest value,
// positions keep every snapshot (each packet also repeats the previous ones, so a lost packet
// leaves no hole), everything else is numbered, acknowledged and resent until the other side
// has it.
//
// Every message except the position snapshots carries a number (per page) and the phase the
// sender was playing: a message that reaches us twice (two brokers, a resend, the link switching
// between the relay and the direct channel) is applied once, and an older value of a "latest
// only" stream never replaces a newer one. Older pages send neither: their messages are applied
// as they come, as before.
const Net = (() => {
  const PREFIX = 'brdl-yo-';
  const BROKERS = ['wss://broker.hivemq.com:8884/mqtt', 'wss://test.mosquitto.org:8081/mqtt'];
  const LATEST = new Set(['S', 'en', 'h']);
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
  // message numbers and the sender's phase (Net.stamp, set by the story)
  let txI = 0;
  let stamp = null;
  const NOMETA = {};
  let meta = NOMETA;
  // per sending page (its id): numbers already applied, newest number of each latest stream
  const peers = new Map();
  // ?netdebug: counters in window.__netdbg (sent, received, duplicates and stale values dropped)
  const nd = new URLSearchParams(location.search).has('netdebug')
    ? Object.assign((window.__netdbg = window.__netdbg || {}), {
        tx: {},
        rx: {},
        dup: {},
        stale: {},
        reset() {
          ['tx', 'rx', 'dup', 'stale'].forEach((k) => (window.__netdbg[k] = {}));
          if (window.__netdbg.story) window.__netdbg.story.reset();
        },
      })
    : null;
  const bump = (o, k) => (o[k] = (o[k] || 0) + 1);

  const emit = (t, d) => (handlers[t] || []).forEach((f) => f(d));
  const state = (s) => emit('state', s);
  const refresh = () => {
    const s = p2pOpen || RL.mate;
    const was = connected;
    connected = s;
    if (was !== s) emit(s ? 'connect' : 'disconnect');
  };

  // ?netsim= (test only) plays a bad network on what this page receives:
  //   jitter                  0-120 ms of random delay, held back in bursts (a congested broker)
  //   delay:300,jitter:100    fixed + random delay (ms)
  //   dup:0.2                 a share of the messages comes a second time, a little later
  //   loss:0.1                a share of the snapshots and "latest only" values is lost (the
  //                           numbered messages are resent by the relay: never lost)
  // Net.sim.set({...}) changes it while running, Net.sim.cut(ms) drops the link for a while
  const SIM = { delay: 0, jitter: 0, dup: 0, loss: 0, burst: 0, cut: 0 };
  const simOn = () => SIM.delay || SIM.jitter || SIM.dup || SIM.loss || SIM.burst;
  ((q) => {
    if (!q) return;
    if (q === 'jitter' || q === '1') return Object.assign(SIM, { jitter: 120, burst: 1 });
    q.split(',').forEach((kv) => {
      const [k, v] = kv.split(':');
      if (k in SIM && k !== 'cut') SIM[k] = +v || 0;
    });
  })(new URLSearchParams(location.search).get('netsim'));
  let simT = 0;
  const rxSim = (t, d, x, o) => {
    const lossy = t === 'p' || LATEST.has(t);
    if (SIM.loss && lossy && Math.random() < SIM.loss) return;
    const now = performance.now();
    let at = now + SIM.delay + Math.random() * SIM.jitter;
    if (SIM.burst && now % 1000 < 250) at = Math.max(at, now - (now % 1000) + 250);
    // numbered messages keep their order (both links deliver them in order)
    if (!lossy) at = simT = Math.max(simT, at);
    setTimeout(() => rxNow(t, d, x, o), at - now);
    if (SIM.dup && Math.random() < SIM.dup)
      setTimeout(() => rxNow(t, d, x, o), at - now + 10 + Math.random() * (SIM.jitter + 40));
  };
  const rx = (t, d, x, o) => {
    if (SIM.cut) return;
    if (simOn()) rxSim(t, d, x, o);
    else rxNow(t, d, x, o);
  };
  // a message seen before (same page, same number) is dropped, and so is a "latest only" value
  // older than the last one applied
  const fresh = (t, x, o) => {
    if (!x || x.i == null || !o) return true;
    let pr = peers.get(o);
    if (!pr) {
      pr = { seen: new Set(), order: [], last: {} };
      peers.set(o, pr);
      if (peers.size > 4) peers.delete(peers.keys().next().value);
    }
    if (LATEST.has(t)) {
      if (x.i <= (pr.last[t] || 0)) {
        if (nd) bump(nd.stale, t);
        return false;
      }
      pr.last[t] = x.i;
      return true;
    }
    if (pr.seen.has(x.i)) {
      if (nd) bump(nd.dup, t);
      return false;
    }
    pr.seen.add(x.i);
    pr.order.push(x.i);
    if (pr.order.length > 4000) pr.seen.delete(pr.order.shift());
    return true;
  };
  // every message from the other side lands here (x: its number and phase, o: the sending page)
  const rxNow = (t, d, x, o) => {
    if (SIM.cut) return;
    if (t === '__rtt') return send('__rtt2', d);
    if (t === '__rtt2') {
      rtt = Math.round(performance.now() - d);
      return;
    }
    if (!fresh(t, x, o)) return;
    if (nd) bump(nd.rx, t);
    // the handlers read the number and the sender's phase through Net.meta
    const was = meta;
    meta = x || NOMETA;
    try {
      emit(t, d);
    } finally {
      meta = was;
    }
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
    pos: [],
    posNew: 0,
    n: 0,
    hello: true,
    // incoming
    rxSeq: 0,
    rxN: 0,
    ackDue: false,
  };
  const topic = (from) => 'brdl-yo/v2/' + code + '/' + from;
  const relayQueue = (t, d, x) => {
    if (t === 'p') {
      RL.pos.push(d);
      RL.posNew++;
      if (RL.pos.length > 6) RL.pos.shift();
    } else if (LATEST.has(t)) RL.latest.set(t, x ? [d, x] : [d]);
    else {
      RL.pend.push(x ? [++RL.seq, t, d, x] : [++RL.seq, t, d]);
      if (RL.pend.length > 400) RL.pend.splice(0, RL.pend.length - 400);
    }
  };
  const relayFlush = () => {
    if (!RL.up) return;
    const idle = !RL.pend.length && !RL.latest.size && !RL.posNew && !RL.ackDue && !RL.hello;
    if (idle) return;
    const pkt = { f: me, st: BORN, n: ++RL.n, a: RL.rxSeq };
    if (RL.hello) pkt.h = 1;
    if (RL.pend.length) pkt.r = RL.pend.slice(0, 60);
    if (RL.latest.size) {
      pkt.l = [...RL.latest].map(([t, v]) => [t, ...v]);
      RL.latest.clear();
    }
    if (RL.posNew) {
      // new snapshots plus the two before them
      pkt.p = RL.pos.slice(-Math.min(RL.pos.length, RL.posNew + 2));
      RL.posNew = 0;
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
      for (const [s, t, d, x] of m.r)
        if (s === RL.rxSeq + 1) {
          RL.rxSeq = s;
          rx(t, d, x, m.f);
        }
      RL.ackDue = true;
    }
    // snapshots carry their own clock: the receiver sorts out duplicates and order
    if (m.p) for (const d of m.p) rx('p', d);
    // packets arrive from both brokers: only the newest "latest" values count
    if (m.n > RL.rxN) {
      RL.rxN = m.n;
      if (m.l) for (const [t, d, x] of m.l) rx(t, d, x, m.f);
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
    c.on('data', (m) => m && m.t && rx(m.t, m.d, m.x, m.o));
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
    if (SIM.cut) return;
    // snapshots carry their own clock and the link's own messages need nothing
    let x;
    if (t !== 'p' && t[0] !== '_') {
      x = { i: ++txI };
      const ph = stamp && stamp();
      if (ph) x.ph = ph;
    }
    if (nd) bump(nd.tx, t);
    if (bc) bc.postMessage(x ? { from: me, t, d, x } : { from: me, t, d });
    else if (p2pOpen && conn && conn.open) {
      try {
        conn.send(x ? { t, d, x, o: me } : { t, d });
      } catch (e) {
        relayQueue(t, d, x);
      }
    } else if (RL.up) relayQueue(t, d, x);
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
        rx(m.t, m.d, m.x, m.from);
      };
      bc.postMessage({ from: me, t: '__hi' });
      return Promise.resolve(c);
    },
    send,
    // the number and phase of the message being handled ({} for an older page's message)
    get meta() {
      return meta;
    },
    // fn() returns the phase this page plays, stamped on what it sends
    set stamp(fn) {
      stamp = fn;
    },
    // test only (tools/qa/net-coop.mjs): a bad network on what this page receives, a lost link
    sim: {
      set(o) {
        Object.assign(SIM, o);
      },
      get: () => ({ ...SIM }),
      cut(ms) {
        SIM.cut = 1;
        p2pOpen = false;
        refresh();
        setTimeout(() => {
          SIM.cut = 0;
          if (!bc) return;
          // local link: say hello again, as a page that comes back does
          p2pOpen = true;
          refresh();
          bc.postMessage({ from: me, t: '__hi' });
        }, ms);
      },
    },
    voice(stream) {
      localStream = stream;
      if (connected) call(stream);
    },
  };
})();
