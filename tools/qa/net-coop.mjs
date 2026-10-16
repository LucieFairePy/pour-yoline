// Co-op network test: two headless players (host + guest) in local co-op, with faults played on
// top of the local link. Counts, per message type, what each side sends and what reaches the
// game, and per gameplay event (a hit, a revive) how many times the host applied it.
//
//   node tools/qa/net-coop.mjs [--port 8862] [--cdp 9432] [--host yoline|william]
//        [--netsim delay:300,jitter:100,dup:0.2,loss:0.1] [--levels tr_s4,garde] [--only a,b]
//        [--out tools/qa/out/<name>]
//
// Scenarios: en (enemy packs per handler), hits (both players hit the same enemy at once, real
// input and scripted), cheats (forged hits / revives / hurts from the guest), dup (every message
// may arrive twice, up to 300 ms late), phase (a phase change during traffic, a late level message
// after the change, an old full state after a newer one), cut (link lost and back mid-level).
// Writes report.json in --out and prints a summary. Exit 1 on a page exception.
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from './serve.mjs';
import { launch } from './chrome.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => {
  const i = process.argv.indexOf('--' + k);
  if (i < 0) return d;
  const v = process.argv[i + 1];
  return !v || v.startsWith('--') ? true : v;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const PORT = +arg('port', 8862);
const CDP = +arg('cdp', 9432);
const HOST = arg('host', 'yoline');
const NETSIM = arg('netsim', '');
const LEVELS = String(arg('levels', 'tr_s4,tr_s5,donjon,raid,garde,tr_ufo')).split(',');
const ONLY = arg('only', '') ? String(arg('only')).split(',') : null;
const OUT = resolve(arg('out', join(HERE, 'out', 'net-' + new Date().toISOString().replace(/[:.]/g, '-'))));
mkdirSync(OUT, { recursive: true });
const want = (k) => !ONLY || ONLY.includes(k);
const log = (...a) => console.log(new Date().toISOString().slice(11, 19), ...a);

const srv = await serve(PORT);
const chrome = await launch({ out: OUT, port: CDP });
const room = 'nq' + Math.random().toString(36).slice(2, 8);
const base = `http://127.0.0.1:${PORT}/borderline/index.html`;
const GUEST = HOST === 'yoline' ? 'william' : 'yoline';
const q = (who, host) =>
  `${base}?local=${room}&role=${who}${host ? '&host=1' : ''}&auto=1&nointro=1&netdebug` +
  (NETSIM ? '&netsim=' + NETSIM : '');
const PROBE = readFileSync(join(HERE, 'net-probe.js'), 'utf8');
const report = { host: HOST, netsim: NETSIM, started: new Date().toISOString(), scen: {}, errors: [] };

const A = await chrome.page('host', null);
const B = await chrome.page('guest', null);
const open = async () => {
  await A.go(q(HOST, true));
  await sleep(500);
  await B.go(q(GUEST, false));
  for (const p of [A, B]) {
    await p.until("typeof Story !== 'undefined' && !!Story.S && typeof Enemies !== 'undefined' && !!Net.code", 60000);
    await p.ev(PROBE + `;__nq.init(${JSON.stringify(p.tag)})`);
  }
  await sleep(1500);
};
const phase = (p) => p.ev('Story.S && Story.S.phase');
const goto = async (ph) => {
  await A.ev(`Story.goto(${JSON.stringify(ph)});1`);
  const ok = (await A.until(`Story.S.phase === ${JSON.stringify(ph)}`, 20000)) && (await B.until(`Story.S && Story.S.phase === ${JSON.stringify(ph)}`, 20000));
  await sleep(7000);
  return ok;
};
const H = (p) => p.ev('JSON.parse(JSON.stringify(__nq.H))');
const dbg = (p) => p.ev('JSON.parse(JSON.stringify(window.__netdbg || null))');
const reset = () => Promise.all([A.ev('__nq.reset();1'), B.ev('__nq.reset();1'), A.ev('window.__netdbg && __netdbg.reset && __netdbg.reset();1'), B.ev('window.__netdbg && __netdbg.reset && __netdbg.reset();1')]);

// the host puts a still enemy (stunned for ever) next to the guest; returns its id
const spawnNearGuest = async (hp = 300, off = 1.8) => {
  const g = await B.ev('Player.body.p.toArray()');
  const id = await A.ev(`(() => {
    const g = V3(${g.join(',')});
    const p = V3(g.x + ${off}, g.y, g.z);
    const gy = Phys.groundAt(p.x, p.y + 1, p.z);
    if (gy > -1e3) p.y = gy;
    const e = Enemies.spawn('pion', p, { hp: ${hp}, max: ${hp}, stun: 1e6, atk: 1e6 });
    return e.id;
  })()`);
  await B.until(`Enemies.list.has(${id})`, 8000);
  // a level that does not send packs in its current stage: send them for it
  await A.ev(`(() => { if (window.__nqTick) return 1; let t = performance.now(); const f = () => { const n = performance.now(); Enemies.netTick((n - t) / 1000); t = n; window.__nqTick = requestAnimationFrame(f); }; window.__nqTick = requestAnimationFrame(f); return 1; })()`);
  await B.until(`Enemies.list.has(${id})`, 8000);
  return id;
};
const stopTick = () => A.ev('cancelAnimationFrame(window.__nqTick); window.__nqTick = 0; 1');
const kit = (p) => p.ev('Story.role');
const hitOf = async (p, id) =>
  (await kit(p)) === 'dame'
    ? { dmg: 9, weak: false }
    : { dmg: 12, stun: await A.ev(`(() => { const T = Enemies.TYPES[Enemies.list.get(${id}).type]; return T.stunP != null ? T.stunP : 2.5; })()`) };
const evStats = (h) => {
  const ev = Object.values(h.ev);
  return {
    events: ev.length,
    delivered: ev.reduce((s, e) => s + e.n, 0),
    applied: ev.filter((e) => e.calls > 0 && e.hp > 0).length,
    doubleApplied: ev.filter((e) => e.calls > 1).length,
    notApplied: ev.filter((e) => e.calls === 0).length,
    kills: ev.reduce((s, e) => s + e.kills, 0),
  };
};
const enemiesBoth = async (id) => {
  await sleep(1200);
  const a = await A.ev(`(() => { const e = Enemies.list.get(${id}); return e ? Math.ceil(e.hp) : 'dead'; })()`);
  const b = await B.ev(`(() => { const e = Enemies.list.get(${id}); return e ? Math.ceil(e.hp) : 'dead'; })()`);
  return { host: a, guest: b, same: a === b };
};

// real input: hold the trigger (rifle) or tap it (sword) while the camera tracks the enemy
const realFire = (p, id, ms) =>
  p.ev(`(async () => {
    const e = () => Enemies.list.get(${id});
    const t0 = performance.now();
    let tap = 0;
    const sword = Story.role === 'valet';
    if (sword && e()) { const q = e().pos; const pp = Player.body.p; Player.yaw = Math.atan2(q.x - pp.x, q.z - pp.z); }
    while (performance.now() - t0 < ${ms} && e()) {
      const q = e().pos;
      const c = R.camera.position;
      const T = V3(q.x, q.y + 1, q.z);
      if (sword) { const pp = Player.body.p; Cam.yaw = Math.atan2(q.x - pp.x, q.z - pp.z); }
      else { const f = T.clone().sub(c).normalize(); Cam.yaw = Math.atan2(f.x, f.z); Cam.pitch = -Math.asin(f.y); }
      if (sword) { tap = (tap + 1) % 2; if (tap) Input.sim.held.add('attack'); else Input.sim.held.delete('attack'); }
      else Input.sim.held.add('attack');
      await new Promise((r) => setTimeout(r, sword ? 320 : 40));
    }
    Input.sim.held.delete('attack');
    return true;
  })()`);

try {
  await open();
  log('open', await phase(A), await phase(B), 'host kit', await kit(A), 'guest kit', await kit(B));

  // ---- en: how many times the guest's enemies are unpacked per pack received
  if (want('en')) {
    await goto('garde');
    await reset();
    const id = await spawnNearGuest(300, 6);
    await sleep(4000);
    const h = await H(B);
    report.scen.en = { level: 'garde', packsSent: (h.sent.host || {}).en || 0, packsDelivered: h.enDeliv, unpackCalls: h.unpack, perPack: +(h.unpack / Math.max(1, h.enDeliv)).toFixed(2) };
    log('en', JSON.stringify(report.scen.en));
    await A.ev(`Enemies.list.delete(${id});1`);
    await stopTick();
  }

  // ---- hits: both players hit the same enemy at the same time, on every combat level
  if (want('hits')) {
    report.scen.hits = {};
    for (const L of LEVELS) {
      if (!(await goto(L))) {
        report.scen.hits[L] = { error: 'phase not reached' };
        continue;
      }
      const r = { kits: [await kit(A), await kit(B)] };
      // scripted: identical to what Combat sends, the guest at the weapon's cadence
      await reset();
      let id = await spawnNearGuest(240, 1.8);
      const gh = await hitOf(B, id);
      const hh = await hitOf(A, id);
      const [gq] = await Promise.all([
        B.ev(`__nq.fire(${id}, ${gh.dmg === 9 ? 40 : 10}, ${gh.dmg === 9 ? 105 : 600}, ${JSON.stringify(gh)})`),
        A.ev(`__nq.fire(${id}, ${hh.dmg === 9 ? 40 : 10}, ${hh.dmg === 9 ? 105 : 600}, ${JSON.stringify(hh)})`),
      ]);
      await sleep(1500);
      let h = await H(A);
      r.scripted = { guestSent: gq.length, ...evStats(h), hostLocalHits: h.hostLocal.calls, killsOfTarget: h.kills[id] || 0, final: await enemiesBoth(id), dbg: await dbg(A) };
      // real input on the guest (and the host at the same time)
      await reset();
      id = await spawnNearGuest(240, 1.8);
      await Promise.all([realFire(B, id, 6000), realFire(A, id, 6000)]);
      await sleep(1500);
      h = await H(A);
      const hb = await H(B);
      r.real = { guestHitsSent: (hb.sent.guest || {}).act || 0, hostDelivered: (h.deliv.act || 0), killsOfTarget: h.kills[id] || 0, final: await enemiesBoth(id), dbg: await dbg(A) };
      await stopTick();
      report.scen.hits[L] = r;
      log('hits', L, JSON.stringify(r));
    }
  }

  // ---- los: real rifle shots from a moving guest at enemies all around (5-45 m): every hit the
  // guest's own aim produced must be accepted by the host (no false "wall" / "too far")
  if (want('los')) {
    report.scen.los = {};
    for (const L of LEVELS) {
      await goto(L);
      if ((await kit(B)) !== 'dame') {
        report.scen.los[L] = { skipped: 'guest has the sword here' };
        continue;
      }
      const r = { rounds: 0, hitsSent: 0, ok: 0, refused: 0, why: [] };
      for (let k = 0; k < 4; k++) {
        await A.ev(`[...Enemies.list.keys()].forEach((k) => Enemies.list.delete(k)); window.__netdbg.story.reset(); 1`);
        await A.ev(`(() => {
          const g = Remote.pos;
          for (let i = 0; i < 12; i++) {
            const a = Math.random() * Math.PI * 2;
            const d = 5 + Math.random() * 40;
            const p = V3(g.x + Math.cos(a) * d, g.y + (Math.random() - 0.3) * 6, g.z + Math.sin(a) * d);
            const gy = Phys.groundAt(p.x, p.y + 3, p.z);
            if (typeof gy === 'number' && gy > -1e3) p.y = gy;
            Enemies.spawn('pion', p, { hp: 1e5, max: 1e5, stun: 1e6, atk: 1e6 });
          }
          return 1;
        })()`);
        await A.ev(`(() => { if (window.__nqTick) return 1; let t = performance.now(); const f = () => { const n = performance.now(); Enemies.netTick((n - t) / 1000); t = n; window.__nqTick = requestAnimationFrame(f); }; window.__nqTick = requestAnimationFrame(f); return 1; })()`);
        await sleep(1500);
        const sent = await B.ev(`(async () => {
          const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
          let sent = 0;
          const oa = Story.ctx.act;
          Story.ctx.act = function (d) { if (d && d.a === 'hit') sent++; return oa.apply(this, arguments); };
          let side = 1;
          for (const e of [...Enemies.list.values()]) {
            const t0 = performance.now();
            side = -side;
            Input.sim.x = side;
            while (performance.now() - t0 < 700 && Enemies.list.has(e.id)) {
              const c = R.camera.position;
              const T = V3(e.pos.x, e.pos.y + 1 + (Math.random() - 0.5) * 0.6, e.pos.z);
              const f = T.clone().sub(c).normalize();
              Cam.yaw = Math.atan2(f.x, f.z);
              Cam.pitch = -Math.asin(f.y);
              Input.sim.held.add('attack');
              await sleep(30);
            }
            Input.sim.held.delete('attack');
            Input.sim.x = 0;
            await sleep(100);
          }
          Story.ctx.act = oa;
          return sent;
        })()`);
        await sleep(1500);
        const st = await A.ev('JSON.parse(JSON.stringify(window.__netdbg.story))');
        r.rounds++;
        r.hitsSent += sent;
        r.ok += st.actOk || 0;
        r.refused += st.actRefused || 0;
        if (st.log) r.why.push(...st.log);
      }
      await stopTick();
      await A.ev(`[...Enemies.list.keys()].forEach((k) => Enemies.list.delete(k)); 1`);
      report.scen.los[L] = r;
      log('los', L, JSON.stringify(r));
    }
  }

  // ---- cheats: forged actions from the guest
  if (want('cheats')) {
    await goto('tr_s4');
    await reset();
    const id = await spawnNearGuest(5000, 1.8);
    const k = await kit(B);
    const legit = await hitOf(B, id);
    const C = {};
    const one = async (name, js, apply = true) => {
      const before = await A.ev(`Math.ceil(Enemies.list.get(${id}) ? Enemies.list.get(${id}).hp : -1)`);
      await B.ev(js);
      await sleep(900);
      const after = await A.ev(`Math.ceil(Enemies.list.get(${id}) ? Enemies.list.get(${id}).hp : -1)`);
      C[name] = { hpLost: before - after };
    };
    await one('legit', `__nq.fire(${id}, 1, 0, ${JSON.stringify(legit)})`);
    await sleep(700);
    await one('dmg999', `__nq.fire(${id}, 1, 0, { dmg: 999 })`);
    await sleep(700);
    await one('wrongWeapon', `__nq.fire(${id}, 1, 0, ${JSON.stringify(k === 'dame' ? { dmg: 12, stun: 2.5 } : { dmg: 9 })})`);
    await sleep(700);
    await one('stun50', `__nq.fire(${id}, 1, 0, { dmg: ${legit.dmg}, stun: 50 })`);
    await sleep(700);
    await one('weakOnPawn', `__nq.fire(${id}, 1, 0, { dmg: 9, weak: true })`);
    await sleep(700);
    await one('rate50', `__nq.fire(${id}, 50, 20, ${JSON.stringify(legit)})`);
    await sleep(1500);
    // far away: the guest walks off 250 m and hits
    const home = await B.ev('Player.body.p.toArray()');
    // a page that says it is 250 m away (positions are the guest's own word)
    await B.ev(`window.__nqSnap = window.__nqSnap || Player.snapshot; Player.snapshot = () => { const s = __nqSnap.call(Player); s[0] += 250; return s; }; 1`);
    await sleep(1500);
    await one('far250m', `__nq.fire(${id}, 3, 700, ${JSON.stringify(legit)})`);
    await B.ev(`Player.snapshot = __nqSnap; 1`);
    await sleep(1500);
    // behind a wall (a box only the host has: the guest's own view is clear)
    if (k === 'dame') {
      // an enemy 12 m away in a direction with nothing in between
      const far = await A.ev(`(() => {
        const g = Remote.pos;
        for (let k = 0; k < 16; k++) {
          const a = (k / 16) * Math.PI * 2;
          const p = V3(g.x + Math.cos(a) * 12, g.y, g.z + Math.sin(a) * 12);
          const o = V3(g.x, g.y + 1.6, g.z);
          const d = V3(p.x - o.x, p.y + 1 - o.y, p.z - o.z);
          const n = d.length();
          if (!Phys.rayHit(o, d.normalize(), n, 0.3) && Phys.groundAt(p.x, p.y + 1, p.z) != null) return Enemies.spawn('pion', p, { hp: 5000, max: 5000, stun: 1e6, atk: 1e6 }).id;
        }
        return Enemies.spawn('pion', V3(g.x + 12, g.y, g.z), { hp: 5000, max: 5000, stun: 1e6, atk: 1e6 }).id;
      })()`);
      await B.until(`Enemies.list.has(${far})`, 8000);
      await A.ev(`(() => { const e = Enemies.list.get(${far}).pos; const g = Remote.pos; const m = V3((e.x + g.x) / 2, 0, (e.z + g.z) / 2); window.__nqWall = Phys.add([m.x - 0.4, e.y - 3, m.z - 3], [m.x + 0.4, e.y + 8, m.z + 3]); return 1; })()`);
      const b0 = await A.ev(`Math.ceil(Enemies.list.get(${far}).hp)`);
      await B.ev(`__nq.fire(${far}, 3, 150, ${JSON.stringify(legit)})`);
      await sleep(900);
      C.throughWall = { hpLost: b0 - (await A.ev(`Math.ceil(Enemies.list.get(${far}).hp)`)) };
      await A.ev(`__nqWall.on = false; __nqWall.min[1] = -1e4; __nqWall.max[1] = -1e4 + 0.1; 1`);
      await sleep(300);
      await B.ev(`__nq.fire(${far}, 3, 150, ${JSON.stringify(legit)})`);
      await sleep(900);
      C.sameShotNoWall = { hpLost: b0 - (await A.ev(`Math.ceil(Enemies.list.get(${far}).hp)`)) };
      await A.ev(`Enemies.list.delete(${far});1`);
    }
    await sleep(700);
    await one('ghostEnemy', `__nq.fire(987654, 1, 0, ${JSON.stringify(legit)})`);
    // revive: the host is not down / is down but far away
    const rv0 = (await H(A)).revived;
    await B.ev(`__nq.act({ a: 'revive' });1`);
    await sleep(800);
    C.reviveNotDown = { revived: (await H(A)).revived - rv0 };
    await A.ev(`Combat.apply(1000);1`);
    await B.ev(`window.__nqSnap = window.__nqSnap || Player.snapshot; Player.snapshot = () => { const s = __nqSnap.call(Player); s[0] += 40; return s; }; 1`);
    await sleep(1500);
    const rv1 = (await H(A)).revived;
    await B.ev(`__nq.act({ a: 'revive' });1`);
    await sleep(800);
    C.reviveFar = { revived: (await H(A)).revived - rv1, hostDown: await A.ev('Combat.down') };
    await B.ev(`Player.snapshot = __nqSnap; 1`);
    // the legit one: next to the host, who is down
    const hp = await A.ev('Player.body.p.toArray()');
    await B.ev(`Player.teleport(V3(${hp[0] + 1}, ${hp[1]}, ${hp[2]}), 0);1`);
    await sleep(1500);
    const rv2 = (await H(A)).revived;
    await B.ev(`__nq.act({ a: 'revive' });1`);
    await sleep(800);
    C.reviveLegit = { revived: (await H(A)).revived - rv2, hostDown: await A.ev('Combat.down') };
    await B.ev(`Player.teleport(V3(${home.join(',')}), 0);1`);
    // the guest tells the host it got hurt / got up
    const hp0 = await A.ev('Combat.hp');
    await B.ev(`Net.send('hurt', { dmg: 60 });1`);
    await sleep(800);
    C.hurtFromGuest = { hostHpLost: hp0 - (await A.ev('Combat.hp')) };
    C.dbg = await dbg(A);
    report.scen.cheats = C;
    log('cheats', JSON.stringify(C));
    await A.ev(`Enemies.list.delete(${id});1`);
    await stopTick();
  }

  // ---- dup: every message may come twice (up to 300 ms late), on two levels
  if (want('dup')) {
    report.scen.dup = {};
    await A.ev('__nq.dup(0.5, 300);1');
    for (const L of ['tr_s4', 'garde']) {
      await goto(L);
      await reset();
      const id = await spawnNearGuest(300, 1.8);
      const gh = await hitOf(B, id);
      const gq = await B.ev(`__nq.fire(${id}, 30, ${gh.dmg === 9 ? 110 : 600}, ${JSON.stringify(gh)})`);
      await sleep(1500);
      const h = await H(A);
      const hb = await H(B);
      report.scen.dup[L] = { copiesInjected: h.copies, guestSent: gq.length, ...evStats(h), killsOfTarget: h.kills[id] || 0, guestUnpackPerPack: +(hb.unpack / Math.max(1, hb.enDeliv)).toFixed(2), staleStatesApplied: hb.staleS, final: await enemiesBoth(id), dbgHost: await dbg(A), dbgGuest: await dbg(B) };
      log('dup', L, JSON.stringify(report.scen.dup[L]));
      await stopTick();
    }
    await A.ev('__nq.dup(0);1');
  }

  // ---- phase: hits racing a phase change; a late level message; an old full state
  if (want('phase')) {
    const P = {};
    await goto('garde');
    await reset();
    const id = await spawnNearGuest(5000, 1.8);
    const gh = await hitOf(B, id);
    // the guest keeps acting while the host leaves for the city
    const fire = B.ev(`__nq.fire(${id}, 40, 100, ${JSON.stringify(gh)})`);
    await sleep(1200);
    await A.ev(`Story.goto('city');1`);
    await fire;
    await sleep(1500);
    await stopTick();
    let h = await H(A);
    const ev = Object.values(h.ev);
    P.race = { sent: 40, delivered: ev.reduce((s, e) => s + e.n, 0), deliveredInOtherPhase: h.phaseMismatch, appliedInOtherPhase: ev.filter((e) => e.calls > 0 && e.at[0] !== e.ph).length };
    // a late 'wipe' from the guard room reaching the guest in the city (a resend after a loss)
    await goto('garde');
    await A.ev(`__nq.capture('wipe');1`);
    await A.ev(`Net.send('wipe');1`);
    await sleep(1000);
    await A.ev(`Story.goto('city');1`);
    await B.until(`Story.S.phase === 'city'`, 20000);
    await sleep(6000);
    await B.ev('__nq.reset();1');
    await A.ev(`__nq.replay('wipe', true)`);
    await sleep(1500);
    h = await H(B);
    P.lateWipe = { guestPhase: await phase(B), teleportsInCity: h.tp.filter((t) => t[0] === 'city').length, tp: h.tp };
    // an old full state arriving after a newer one (a slow path delivering late)
    await A.ev(`__nq.capture('S');1`);
    await sleep(2600);
    await A.ev(`Story.goto('tr_s1');1`);
    await B.until(`Story.S.phase === 'tr_s1'`, 20000);
    await sleep(4000);
    await B.ev('__nq.reset();1');
    const seen = [];
    await B.ev(`window.__nqPh = []; window.__nqPhT = setInterval(() => __nqPh.push(Story.S.phase), 50);1`);
    await A.ev(`__nq.replay('S', false)`);
    await sleep(2500);
    const phs = await B.ev(`clearInterval(__nqPhT); [...new Set(__nqPh)]`);
    h = await H(B);
    P.staleState = { staleApplied: h.staleS, guestPhasesSeen: phs, dbgGuest: await dbg(B) };
    report.scen.phase = P;
    log('phase', JSON.stringify(P));
  }

  // ---- cut: the link drops for 4 s mid-fight and comes back
  if (want('cut')) {
    const has = await B.ev('!!(Net.sim && Net.sim.cut)');
    if (!has) report.scen.cut = { skipped: 'no Net.sim.cut in this build' };
    else {
      await goto('tr_s5');
      await reset();
      const id = await spawnNearGuest(400, 1.8);
      const gh = await hitOf(B, id);
      const fire = B.ev(`__nq.fire(${id}, 30, ${gh.dmg === 9 ? 110 : 600}, ${JSON.stringify(gh)})`);
      await sleep(1500);
      await B.ev('Net.sim.cut(4000);1');
      await fire;
      await sleep(6000);
      const h = await H(A);
      report.scen.cut = { ...evStats(h), final: await enemiesBoth(id), phases: [await phase(A), await phase(B)], connected: [await A.ev('Net.connected'), await B.ev('Net.connected')] };
      log('cut', JSON.stringify(report.scen.cut));
      await stopTick();
    }
  }
} catch (e) {
  report.fatal = String(e && e.stack || e);
  log('FATAL', e);
} finally {
  report.errors = chrome.errors;
  writeFileSync(join(OUT, 'report.json'), JSON.stringify(report, null, 1));
  log('errors', chrome.errors.length, chrome.errors.slice(0, 5).map((e) => e.page + ' ' + e.text.slice(0, 160)).join(' | '));
  log('report', join(OUT, 'report.json'));
  await chrome.close();
  srv.close();
  process.exit(chrome.errors.some((e) => e.kind === 'exception') || report.fatal ? 1 : 0);
}
