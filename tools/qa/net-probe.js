// Injected into both game pages by tools/qa/net-coop.mjs (local co-op over a BroadcastChannel).
// It measures the network layer from outside: what each side sends, what reaches the game, how
// many times each gameplay event is applied. It can also play a faulty network on top of the
// local link (duplicates, late copies), which works on old and new builds alike.
window.__nq = (() => {
  const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
  const H = {
    tag: '',
    ids: {}, // BroadcastChannel sender id -> page tag
    sent: {}, // per sender tag, per message type: messages seen on the channel (copies excluded)
    copies: 0, // duplicates / late copies this page injected
    deliv: {}, // per message type: deliveries that reached the game's handlers on this page
    unpack: 0, // Enemies.unpack calls (guest)
    enDeliv: 0, // 'en' messages delivered (guest)
    staleS: 0, // full states applied although a newer one had been applied before
    sk: 0, // newest state counter applied
    ev: {}, // gameplay events applied on the host: q -> { n: deliveries, calls, hp, kills }
    hostLocal: { calls: 0, hp: 0 },
    kills: {}, // enemy id -> kills seen (host)
    deadHits: 0, // damage applied to an enemy that was already gone
    revived: 0,
    phaseMismatch: 0, // acts delivered while the host is in another phase than the sender
    tp: [], // teleports of the local player (late 'wipe' handlers)
  };
  let obs = null;
  let dupP = 0;
  let dupMax = 150;
  let cap = {};
  let cur = [];
  let localQ = null;

  const count = (o, k, n = 1) => (o[k] = (o[k] || 0) + n);

  const init = (tag) => {
    H.tag = tag;
    obs = new BroadcastChannel('brdl-yo-' + Net.code);
    obs.onmessage = (e) => {
      const m = e.data;
      if (!m || !m.t) return;
      if (m.t === '__nqid' && !H.ids[m.from]) {
        // a page we did not know: tell it who we are too
        H.ids[m.from] = m.d;
        if (m.d !== tag) Net.send('__nqid', tag);
      }
      if (m.__dup) return;
      const who = H.ids[m.from] || m.from;
      H.sent[who] = H.sent[who] || {};
      count(H.sent[who], m.t);
      if (cap[m.t] === null) cap[m.t] = m;
      if (dupP && m.t[0] !== '_' && Math.random() < dupP) {
        H.copies++;
        setTimeout(() => obs.postMessage({ ...m, __dup: 1 }), Math.random() * dupMax);
      }
    };
    Net.send('__nqid', tag);
    // what reaches the game: a listener added after the game's own ones, for every type the
    // game listens to
    const types = ['S', 'act', 'en', 'hurt', 'revived', 'rv', 'shot', 'slash', 'tel', 'bossfx', 'foefx', 'call', 'wipe', 'dwipe', 'rwipe', 'p'];
    types.forEach((t) => Net.on(t, () => count(H.deliv, t)));
    Net.on('en', () => H.enDeliv++);
    const ou = Enemies.unpack;
    Enemies.unpack = function () {
      H.unpack++;
      return ou.apply(this, arguments);
    };
    // the host numbers every full state it sends (an extra field the game ignores)
    const os = Net.send;
    let k = 0;
    Net.send = function (t, d) {
      if (t === 'S' && Net.isHost && d) d.__nqk = ++k;
      return os.apply(this, arguments);
    };
    Net.on('S', (ns) => {
      if (Net.isHost || !ns || ns.__nqk == null) return;
      if (ns.__nqk < H.sk) H.staleS++;
      else H.sk = ns.__nqk;
    });
    // damage applied on the host, attributed to the act being handled
    const od = Enemies.damage;
    Enemies.damage = function (id, dmg) {
      const e = Enemies.list.get(id);
      const hp0 = e ? e.hp : null;
      const r = od.apply(this, arguments);
      const gone = !!e && !Enemies.list.has(id);
      if (!e) H.deadHits += 0;
      const rec = { id, hp: e ? hp0 - e.hp : 0, kill: gone };
      if (gone) count(H.kills, id);
      if (localQ) {
        H.hostLocal.calls++;
        H.hostLocal.hp += rec.hp;
      } else cur.push(rec);
      return r;
    };
    const orv = Combat.revived;
    Combat.revived = function () {
      H.revived++;
      return orv.apply(this, arguments);
    };
    Net.on('act', (d) => {
      const calls = cur.splice(0);
      if (!d || d.q == null) return;
      const ev = (H.ev[d.q] = H.ev[d.q] || { n: 0, calls: 0, hp: 0, kills: 0, ph: d.nqph, at: [] });
      ev.n++;
      ev.at.push(Story.S && Story.S.phase);
      if (d.nqph && Story.S && d.nqph !== Story.S.phase) H.phaseMismatch++;
      calls.forEach((c) => {
        ev.calls++;
        ev.hp += c.hp;
        if (c.kill) ev.kills++;
      });
    });
    // the local player jumping (a 'wipe' respawn) is recorded
    const otp = Player.teleport;
    Player.teleport = function (p) {
      H.tp.push([Story.S && Story.S.phase, +p.x.toFixed(1), +p.y.toFixed(1), +p.z.toFixed(1)]);
      return otp.apply(this, arguments);
    };
    return tag;
  };

  // gameplay events from this page: n hits on enemy id, every `every` ms, each tagged with a
  // unique q (the host attributes the damage it applies to it)
  let qn = 0;
  const fire = async (id, n, every, hit) => {
    const sent = [];
    for (let i = 0; i < n; i++) {
      const q = H.tag + ++qn;
      const d = { a: 'hit', id, ...hit, q, nqph: Story.S && Story.S.phase };
      sent.push(q);
      if (Net.isHost) {
        localQ = q;
        Story.ctx.act(d);
        localQ = null;
      } else Story.ctx.act(d);
      if (every) await sleep(every);
    }
    return sent;
  };
  const act = (d) => {
    const q = H.tag + ++qn;
    Story.ctx.act({ ...d, q, nqph: Story.S && Story.S.phase });
    return q;
  };

  return {
    H,
    init,
    fire,
    act,
    dup(p, max = 150) {
      dupP = p;
      dupMax = max;
    },
    // keep the next message of a type seen on the channel, to post it again later
    capture(t) {
      cap[t] = null;
    },
    // post it again: `fresh` gives it a new message number (a resend the receiver never saw)
    replay(t, fresh) {
      const m = cap[t];
      if (!m) return false;
      const c = { ...m, __dup: 1 };
      if (fresh && c.x) c.x = { ...c.x, i: 1e9 + ++qn };
      obs.postMessage(c);
      H.copies++;
      return true;
    },
    sleep,
    reset() {
      H.sent = {};
      H.deliv = {};
      H.unpack = 0;
      H.enDeliv = 0;
      H.staleS = 0;
      H.ev = {};
      H.hostLocal = { calls: 0, hp: 0 };
      H.kills = {};
      H.revived = 0;
      H.phaseMismatch = 0;
      H.tp = [];
      H.copies = 0;
      cur = [];
    },
    enemies: () => [...Enemies.list.values()].map((e) => [e.id, e.type, Math.ceil(e.hp)]),
  };
})();
