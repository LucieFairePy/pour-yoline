// La table de Cœur (tr_hV, tr_hD, tr_hK): the garden, the dancers and the carousel move on a clock
// shared by both screens, and the host judges with it. Before the fix each page ran its own clock
// (local.rt, restarted by each page on a new deal and counted with frames capped at 50 ms), and
// the host judged the guest's cuts, brushes and roses against its own: with the two pages at
// unequal frame rates the clocks drifted apart, and in the campaign « E au rosier sans effet »
// repeated for 15 minutes in tr_hV (the guest cutting, its garden no longer where the host's was).
//
// Here William hosts and Yoline joins, so the guest (Yoline) is the one who acts on the moving
// part: in tr_hV she cuts the roses of the turning garden (round 2), in tr_hD she carries the
// tower across the ball (round 1), in tr_hK she throws the roses on the turning carousel (round
// 2). Her page is slowed: a frame at most every --slow ms (70 by default, ~14 fps), each longer
// than the 50 ms a frame may count, the way a loaded machine or the hitches of a long run drop
// time; the host's runs
// free. Both play with the campaign solvers (tools/qa/campaign/levels/<phase>.js) through the
// game's own input (Input.sim keys and stick): the host walks up to the guide's place, the guest
// acts when her own screen shows it right. Measured:
//   - the clock offset between the two screens, each value taken at the frame that drew it and
//     brought to the same instant (Date.now is one clock for both pages of this Chrome)
//   - tr_hV: every cut the guest sends (the level only sends one for a bush within reach on her
//     screen) must change the host's state (accepted), none « sans effet »
//   - tr_hD: every brush the host counts must be one the guest's screen showed (a couple within
//     1.25 m of her in the 1.5 s before) or a jump with the tower (the level's other strike: the
//     solver's hop when stuck); the crossing must be done (unless only such jumps stopped it)
//   - tr_hK: every rose the guest's screen sees land in a vase (or well off it) must be judged so
//     by the host; the two vases must be filled
//   node tools/qa/fix-cour-clock.mjs [--port 8864 --cdp 9434 --root <checkout>] [--levels tr_hV,tr_hD,tr_hK]
//                                    [--slow 70]
import { readFileSync } from 'node:fs';
import { join, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { run } from './fix-kit.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const LIB = readFileSync(join(HERE, 'campaign', 'lib.js'), 'utf8');
const arg = (k, d) => {
  const i = process.argv.indexOf('--' + k);
  return i < 0 || !process.argv[i + 1] ? d : process.argv[i + 1];
};
const LEVELS = arg('levels', 'tr_hV,tr_hD,tr_hK').split(',');
const SLOW = +arg('slow', 70);
const TAU = Math.PI * 2;
// per level: its debug handle, the round to start in, how long to give it, the speed of the
// moving part (to turn a clock offset into metres on screen)
const LV = {
  tr_hV: { dbg: 'dbgV', round: 1, budget: 150, mps: (TAU / 46) * 6, what: 'jardin' },
  tr_hD: { dbg: 'dbgD', round: 0, budget: 300, mps: 2.2 * 1.1, what: 'danseurs' },
  tr_hK: { dbg: 'dbgK', round: 1, budget: 240, mps: (TAU / 30) * 4.2, what: 'carrousel' },
};

// both pages: what the world is given each frame, with the level's clock and the moment
const HOOK = (dbg) => `(() => {
  const W = CourH;
  window.__fr = 0;
  window.__dbg = ${JSON.stringify(dbg)};
  window.__clk = null;
  window.__onFrame = null;
  if (!W.__fixClock) {
    const u = W.update;
    W.update = (dt, t, p) => {
      const L = W[window.__dbg] && W[window.__dbg].local;
      if (L) window.__clk = [L.rt, Date.now(), L.key];
      window.__fr++;
      if (window.__onFrame) window.__onFrame();
      return u(dt, t, p);
    };
    W.__fixClock = 1;
  }
  return 1;
})()`;

// the guest only: a frame at most every SLOW ms (the others skipped), so each frame is longer
// than the 50 ms one frame may count
const SLOWDOWN = `(() => {
  window.__slow = ${SLOW};
  if (!window.__rafSlow) {
    const raf = window.requestAnimationFrame.bind(window);
    let last = 0;
    const gate = (cb) => raf((ts) => {
      // every callback of an admitted frame runs (the game loop is not the only one)
      if (ts !== last && ts - last < window.__slow) return gate(cb);
      last = ts;
      cb(ts);
    });
    window.requestAnimationFrame = gate;
    window.__rafSlow = 1;
  }
  return 1;
})()`;

// the guest only: what she sends, and what her own screen showed when she sent it
const WATCH = {
  // a cut is sent by the level for the nearest bush within reach on her screen: accepted when the
  // host's state moves (a rose cut, a replant, the round or stage changing) within 2.5 s
  tr_hV: `(() => {
    window.__acts = [];
    const ctx = Story.ctx;
    const orig = ctx.act;
    ctx.act = function (d) {
      if (d && d.a === 'cut') {
        const x = Story.S.x;
        const e = { t: Date.now(), i: d.i, ok: null };
        const k0 = [x.cut, x.roll, x.round, x.stage, x.pause].join('|');
        window.__acts.push(e);
        const t0 = performance.now();
        const poll = () => {
          const y = Story.S.x;
          if ([y.cut, y.roll, y.round, y.stage, y.pause].join('|') !== k0) e.ok = true;
          else if (performance.now() - t0 > 2500) e.ok = false;
          else return setTimeout(poll, 50);
        };
        setTimeout(poll, 50);
      }
      return orig.call(this, d);
    };
    return 1;
  })()`,
  // while she carries: the nearest couple on her screen, each frame; a brush the host counts
  // (x.str up, or a spill: x.roll up) is explained when one came within 1.25 m in the 1.5 s before
  tr_hD: `(() => {
    const W = CourH;
    window.__near = [];
    window.__strikes = [];
    window.__jumps = [];
    const ctx = Story.ctx;
    const orig = ctx.act;
    ctx.act = function (d) {
      if (d && d.a === 'jump') window.__jumps.push(Date.now());
      return orig.call(this, d);
    };
    let k0 = null;
    window.__onFrame = () => {
      const x = Story.S && Story.S.x;
      if (!x || Story.S.phase !== 'tr_hD') return;
      const now = Date.now();
      const me = W.dbgD.carrierOf(x) === Story.role;
      if (me && x.carry === 1 && x.stage === 0) {
        const p = Player.body.p;
        let m = 99;
        W.dbgD.couples().forEach((c) => {
          const q = W.coupleAt(c, W.dbgD.local.rt);
          m = Math.min(m, Math.hypot(W.O.x + q.x - p.x, W.O.z + q.z - p.z));
        });
        window.__near.push([now, m]);
        if (window.__near.length > 4000) window.__near.splice(0, 1000);
      }
      const k = [x.str | 0, x.roll | 0];
      if (k0 && (k[0] > k0[0] || k[1] > k0[1])) {
        const seen = window.__near.filter((n) => n[0] > now - 1500).map((n) => n[1]);
        const minD = seen.length ? Math.min(...seen) : 99;
        // (a jump with the tower is a strike too: the level's own rule, not the dancers)
        const jump = window.__jumps.some((t) => t > now - 1500);
        window.__strikes.push({ t: now, spill: k[1] > k0[1], minD: +minD.toFixed(2), jump, explained: minD < 1.25 || jump });
      }
      k0 = k;
    };
    return 1;
  })()`,
  // a throw: where her screen puts the vases when the rose comes down (her clock + the flight);
  // then the host's verdict (a vase filled, or not) once it has landed
  tr_hK: `(() => {
    const W = CourH;
    const K = W.dbgK;
    window.__acts = [];
    const ctx = Story.ctx;
    const orig = ctx.act;
    const nfull = (m) => (m & 1) + ((m >> 1) & 1);
    ctx.act = function (d) {
      if (d && d.a === 'throw') {
        const x = Story.S.x;
        const path = W.throwPath(d.ang, d.pow);
        const spin = K.ROUNDS[Math.min(x.round, 1)].spin;
        const ang = spin * (K.local.rt + path.t);
        let dmin = 99;
        if (!path.blocked && path.land.z >= W.CURTAIN_Z)
          K.vaseDeal().forEach((v, i) => {
            if ((x.full | 0) & (1 << i)) return;
            const q = K.vasePos(v, ang);
            dmin = Math.min(dmin, Math.hypot(path.land.x - q.x, path.land.z - q.z));
          });
        const e = { t: Date.now(), ang: d.ang, pow: d.pow, dMine: +dmin.toFixed(2), mine: dmin < 0.68 ? 'hit' : dmin > 0.88 ? 'miss' : '?', host: null };
        const k0 = [nfull(x.full | 0), x.round, x.stage];
        window.__acts.push(e);
        setTimeout(() => {
          const y = Story.S.x;
          e.host = nfull(y.full | 0) > k0[0] || y.round !== k0[1] || y.stage !== k0[2] ? 'hit' : 'miss';
        }, (path.t + 1.2) * 1000);
      }
      return orig.call(this, d);
    };
    return 1;
  })()`,
};

run('cour-clock', async ({ A: A0, B: B0, chrome, base, sleep, log }) => {
  // William hosts, Yoline joins: the pages kit-agnostic fix-kit opened are re-opened that way
  const room = 'fc' + Math.random().toString(36).slice(2, 8);
  const A = A0;
  const B = B0;
  await A.go(`${base}index.html?local=${room}&role=william&host=1&auto=1&nointro=1`);
  await sleep(500);
  await B.go(`${base}index.html?local=${room}&role=yoline&auto=1&nointro=1`);
  const ph = 'Story.S && Story.S.phase';
  if (!(await A.until(ph, 60000)) || !(await B.until(ph, 60000))) return { ok: false, notes: 'the two players did not start' };
  if (!(await A.until('Net.isHost', 10000)) || (await B.ev('Net.isHost'))) return { ok: false, notes: 'William is not the host' };
  void chrome;
  const out = {};
  let ok = true;
  for (const L of LEVELS) {
    const C = LV[L];
    log(L, 'start');
    // fresh pages for each level (the guest's slowdown and hooks are per page)
    await B.go(`${base}index.html?local=${room}&role=yoline&auto=1&nointro=1`);
    await B.until(ph, 60000);
    await sleep(1500);
    await A.ev(`Story.goto(${JSON.stringify(L)}, (s) => { s.x.round = ${C.round}; }); 1`);
    const built = `Story.S && Story.S.phase === ${JSON.stringify(L)} && CourH.built && CourH.${C.dbg} && CourH.${C.dbg}.local.key`;
    if (!(await A.until(built, 40000)) || !(await B.until(built, 40000))) {
      out[L] = { ok: false, notes: L + ' did not load' };
      ok = false;
      continue;
    }
    await sleep(1500);
    const kits = [await A.ev('Story.role'), await B.ev('Story.role')];
    await A.ev(HOOK(C.dbg));
    await B.ev(HOOK(C.dbg));
    await B.ev(WATCH[L]);
    await B.ev(SLOWDOWN);
    // the players' hands: the campaign's solver of the level on both pages
    const src = readFileSync(join(HERE, 'campaign', 'levels', L + '.js'), 'utf8');
    for (const p of [A, B]) {
      await p.ev(LIB + ';' + src + ';1');
      p.ev('(async () => { try { window.__clr = String(await CL.run()); } catch (e) { window.__clr = "EXC " + (e && e.stack || e); } })(); 1').catch(() => {});
    }
    // the clocks, side by side, every second until the level is won or the time is up
    const rows = [];
    const t0 = Date.now();
    let fps = null;
    let lastKey = null;
    let f0 = [await A.ev('window.__fr'), await B.ev('window.__fr'), Date.now()];
    const done = L === 'tr_hD' ? '(Story.S.x.done | 0) >= 1 || Story.S.x.stage !== 0' : 'Story.S.x.stage !== 0';
    while (Date.now() - t0 < C.budget * 1000) {
      await sleep(1000);
      const q = 'JSON.stringify([window.__clk, window.__fr])';
      const [a, b] = (await Promise.all([A.ev(q), B.ev(q)])).map(JSON.parse);
      // (a new deal: the guest hears of it a little after the host, the sample after is the one kept)
      const key = a[0] && b[0] && a[0][2] === b[0][2] ? a[0][2] : null;
      const steady = key && key === lastKey;
      lastKey = key;
      if (steady) {
        // both clocks brought to the same instant
        const off = a[0][0] - a[0][1] / 1000 - (b[0][0] - b[0][1] / 1000);
        rows.push(+off.toFixed(3));
      }
      if (!fps && Date.now() - f0[2] > 8000) fps = [((a[1] - f0[0]) * 1000) / (Date.now() - f0[2]), ((b[1] - f0[1]) * 1000) / (Date.now() - f0[2])].map((v) => Math.round(v));
      if (await A.ev(done)) break;
    }
    const won = await A.ev(done);
    const secs = Math.round((Date.now() - t0) / 1000);
    for (const p of [A, B]) await p.ev('window.CL && (CL.abort = true); Input.sim.x = 0; Input.sim.z = 0; Input.sim.held.clear(); 1').catch(() => {});
    await sleep(L === 'tr_hK' ? 3500 : 800);
    const notes = JSON.parse(await B.ev('JSON.stringify((window.CB && CB.notes || []).map((n) => n.text))'));
    const abs = rows.map(Math.abs);
    const worst = abs.length ? Math.max(...abs) : null;
    const med = abs.length ? abs.slice().sort((x, y) => x - y)[abs.length >> 1] : null;
    const r = { kits: { host: kits[0], guest: kits[1] }, fps: fps && { host: fps[0], guest: fps[1] }, seconds: secs, won, clockOffsetS: { median: med, worst, rows }, worstOffsetM: worst == null ? null : +(worst * C.mps).toFixed(2) };
    let pass = worst != null && worst < 0.15;
    if (L === 'tr_hV') {
      const acts = JSON.parse(await B.ev('JSON.stringify(window.__acts)'));
      r.cutsSent = acts.length;
      r.cutsAccepted = acts.filter((e) => e.ok).length;
      r.cutsIgnored = acts.filter((e) => e.ok === false).length;
      r.sansEffet = notes.filter((n) => /sans effet/.test(n)).length;
      pass = pass && won && r.cutsSent > 0 && r.cutsIgnored === 0;
    }
    if (L === 'tr_hD') {
      const st = JSON.parse(await B.ev('JSON.stringify(window.__strikes)'));
      r.strikes = st.length;
      r.unexplainedStrikes = st.filter((s) => !s.explained).length;
      r.jumpStrikes = st.filter((s) => s.jump).length;
      r.strikeLog = st;
      r.roll = await A.ev('Story.S.x.roll | 0');
      // not across in time only because of the solver's hops with the tower (« on ne saute pas »:
      // the solver's own retries, not the dancers) is noted, not failed
      pass = pass && (won || r.jumpStrikes > 0) && r.unexplainedStrikes === 0;
    }
    if (L === 'tr_hK') {
      const acts = JSON.parse(await B.ev('JSON.stringify(window.__acts)'));
      r.throws = acts.length;
      r.hostHits = acts.filter((e) => e.host === 'hit').length;
      r.mineHit = acts.filter((e) => e.mine === 'hit').length;
      r.disagree = acts.filter((e) => e.host && e.mine !== '?' && e.mine !== e.host).length;
      r.throwLog = acts;
      pass = pass && won && r.throws > 0 && r.disagree === 0;
    }
    r.ok = !!pass;
    out[L] = r;
    ok = ok && r.ok;
    log(L, r.ok ? 'ok' : 'FAILED', JSON.stringify({ ...r, strikeLog: undefined, throwLog: undefined }));
    // back to the city between two levels, both pages
    await A.ev("Story.goto('city'); 1");
    await A.until("Story.S.phase === 'city'", 20000);
    await sleep(1500);
  }
  return { ok, slowGuestMs: SLOW, levels: out, notes: ok ? 'one clock for both screens: what the guest does on hers, the host accepts' : 'the screens disagree (see levels)' };
});
