// BORDERLINE campaign test: a NEW game played by two headless players in local co-op, from the
// prologue to the credits, the way two players do it (never Story.goto to skip progression).
//
//   node tools/qa/campaign/run.mjs [--host yoline|william] [--from <phase> [--resume <journal dir>]]
//                                  [--only <phase,...>] [--no-resume-checks] [--port 8863 --cdp 9433]
//
// --host       who creates the game (default yoline); the other one joins
// --from       start at that phase: with --resume, the save left by an earlier run (its save.json)
//              is put back in the fresh profile; without, a save "every épreuve before <phase>
//              done" is written — both are shortcuts and are labelled in the journal
// --cap        at most that many seconds per level
// --stop       stop after that phase (debugging one level)
//
// Writes tools/qa/out/campaign-<date>-<host>/journal.md + journal.json (+ screenshots, save.json),
// chronological: time, phase, step, who did what, how (« entrée réelle » / « action du jeu » /
// « raccourci : raison »), the result on both screens. Stops at the first blocking step with its
// context, then goes on past it with a labelled shortcut when one exists, to find later blockers.
//
// The per-level solvers are tools/qa/campaign/levels/<phase>.js: injected in both pages, each
// defines window.CL = { timeout, async run() } and plays the part of the page's own kit
// (Story.role) through tools/qa/campaign/lib.js (Input.sim, Story.ctx.act).
import { readFileSync, writeFileSync, mkdirSync, existsSync, copyFileSync } from 'node:fs';
import { resolve, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { serve } from '../serve.mjs';
import { launch } from '../chrome.mjs';

const HERE = dirname(fileURLToPath(import.meta.url));
const arg = (k, d) => {
  const i = process.argv.indexOf('--' + k);
  if (i < 0) return d;
  const v = process.argv[i + 1];
  return !v || v.startsWith('--') ? true : v;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const HOST = arg('host', 'yoline') === 'william' ? 'william' : 'yoline';
const GUEST = HOST === 'yoline' ? 'william' : 'yoline';
const PORT = +arg('port', 8863);
const CDP = +arg('cdp', 9433);
const FROM = arg('from', null);
const RESUME = arg('resume', null);
const STOP = arg('stop', null);
const ONLY = typeof arg('only', null) === 'string' ? arg('only').split(',') : null;
const RESUME_CHECKS = !arg('no-resume-checks', false);
// --cap <s>: never wait longer than that for a level (probing runs)
const CAP = +arg('cap', 1e9);
const stamp = new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19);
const OUT = resolve(arg('out', join(HERE, '..', 'out', `campaign-${stamp}-${HOST}`)));
mkdirSync(OUT, { recursive: true });
const LIB = readFileSync(join(HERE, 'lib.js'), 'utf8');
const PROBE = readFileSync(join(HERE, '..', 'probe.js'), 'utf8');

// ---------------------------------------------------------------- journal
const J = { started: new Date().toISOString(), host: HOST, entries: [], levels: [], blockers: [], bugs: [], resumes: [], syncs: [], errors: [] };
const t0 = Date.now();
const clock = () => new Date().toISOString().slice(11, 19);
const HOW = { reelle: 'entrée réelle', action: 'action du jeu', raccourci: 'raccourci', attente: 'attente', check: 'vérification', info: 'info partagée (voix simulée)' };
let curPhase = '-';
const jot = (step, who, how, detail, result = '') => {
  const e = { t: clock(), s: Math.round((Date.now() - t0) / 1000), phase: curPhase, step, who, how, detail, result };
  J.entries.push(e);
  console.log(`${e.t} [${e.phase}] ${step} · ${who} · ${HOW[how] || how}${how === 'raccourci' ? '' : ''} · ${detail}${result ? ' → ' + result : ''}`);
  flush();
  return e;
};
const flush = () => {
  writeFileSync(join(OUT, 'journal.json'), JSON.stringify(J, null, 1));
  const L = [`# Campagne BORDERLINE — hôte ${HOST}, ${J.started}`, ''];
  const cut = J.entries.filter((e) => e.how === 'raccourci').length;
  L.push(`Raccourcis : ${cut} · bloquants : ${J.blockers.length} · bugs : ${J.bugs.length} · erreurs de page : ${J.errors.length}`, '');
  if (J.end) L.push(`Fin : ${J.end}`, '');
  if (J.levels.length) {
    L.push('| phase | durée s | piloté | raccourcis | résultat |', '|---|---|---|---|---|');
    for (const l of J.levels) L.push(`| ${l.phase} | ${l.secs} | ${l.how} | ${l.shortcuts} | ${l.result} |`);
    L.push('');
  }
  if (J.blockers.length) {
    L.push('## Étapes bloquantes', '');
    J.blockers.forEach((b, i) => L.push(`${i + 1}. [${b.phase}] ${b.step} — ${b.cause}${b.shots ? ' — captures ' + b.shots.join(', ') : ''}`));
    L.push('');
  }
  if (J.bugs.length) {
    L.push('## Bugs non bloquants', '');
    J.bugs.forEach((b) => L.push(`- [${b.phase}] ${b.text}`));
    L.push('');
  }
  L.push('## Journal', '', '| heure | s | phase | étape | qui | comment | détail | résultat |', '|---|---|---|---|---|---|---|---|');
  const esc = (s) => String(s ?? '').replace(/\|/g, '\\|').replace(/\n/g, ' ');
  for (const e of J.entries)
    L.push(`| ${e.t} | ${e.s} | ${e.phase} | ${esc(e.step)} | ${e.who} | ${e.how === 'raccourci' ? '**raccourci**' : HOW[e.how] || e.how} | ${esc(e.detail)} | ${esc(e.result)} |`);
  if (J.errors.length) {
    L.push('', '## Erreurs de page', '');
    J.errors.forEach((e) => L.push(`- ${e.t} [${e.phase}] ${e.page} ${e.kind}${e.count > 1 ? ` (×${e.count}, jusqu’à ${e.last})` : ''}: ${esc(e.text).slice(0, 400)}`));
  }
  writeFileSync(join(OUT, 'journal.md'), L.join('\n') + '\n');
};

// ---------------------------------------------------------------- browser
// a server already answering on the port (an earlier one of ours) is reused
const up = await fetch(`http://127.0.0.1:${PORT}/borderline/index.html`).then((r) => r.ok).catch(() => false);
const srv = up ? { close() {} } : await serve(PORT, resolve(HERE, '../../..'));
const base = `http://127.0.0.1:${PORT}/borderline/`;
const chrome = await launch({ out: OUT, port: CDP });
const room = 'camp' + Math.random().toString(36).slice(2, 8);
const urlOf = (who) => `${base}index.html?local=${room}&role=${who}${who === HOST ? '&host=1' : ''}&auto=1&nointro=1`;
// Y = Yoline's page, W = William's page; H = the host's page, G = the guest's
let Y, W;
const P = () => ({ yoline: Y, william: W });
const H = () => P()[HOST];
const G = () => P()[GUEST];
const both = () => [Y, W];
const nm = (p) => (p === Y ? 'Yoline' : 'William');
let errSeen = 0;
// the same error thrown every frame is one entry with a count
const pullErrors = () => {
  for (const e of chrome.errors.slice(errSeen)) {
    const page = e.page === 'Y' ? 'Yoline' : e.page === 'W' ? 'William' : e.page;
    const same = J.errors.find((o) => o.page === page && o.text === e.text);
    if (same) {
      same.count = (same.count || 1) + 1;
      same.last = clock();
      continue;
    }
    J.errors.push({ t: clock(), phase: curPhase, page, kind: e.kind, text: e.text, count: 1 });
    console.log('PAGE ERROR', page, e.kind, e.text.slice(0, 200));
  }
  errSeen = chrome.errors.length;
};

const ev = async (p, expr) => p.ev(expr);
const evs = (p, expr) => p.ev(expr).catch((e) => 'ERR ' + e.message.slice(0, 200));
const inject = async (p) => {
  await p.until("typeof Story !== 'undefined' && typeof R !== 'undefined' && !!R.renderer && typeof Input !== 'undefined'", 90000);
  await p.ev(PROBE + ';1');
  await p.ev(LIB + ';1');
};
const openPages = async () => {
  Y = await chrome.page('Y', null);
  W = await chrome.page('W', null);
  await H().go(urlOf(HOST));
  await sleep(700);
  await G().go(urlOf(GUEST));
  await inject(Y);
  await inject(W);
  const ok = (await Y.until('!!(Story.S && Story.S.phase)', 90000)) && (await W.until('!!(Story.S && Story.S.phase)', 90000));
  return ok;
};
const closePages = async () => {
  for (const p of both()) {
    try {
      await p.send('Page.close');
    } catch (e) {}
  }
  await sleep(1500);
};
const key = async (p, code, ms = 120) => {
  const k = { KeyE: ['e', 69], Enter: ['Enter', 13], Space: [' ', 32], Escape: ['Escape', 27] }[code] || [code, 0];
  await p.send('Input.dispatchKeyEvent', { type: 'keyDown', code, key: k[0], windowsVirtualKeyCode: k[1] });
  await sleep(ms);
  await p.send('Input.dispatchKeyEvent', { type: 'keyUp', code, key: k[0], windowsVirtualKeyCode: k[1] });
};

// ---------------------------------------------------------------- state
const STATE = `JSON.stringify((() => { const S = Story.S || {}; return { phase: S.phase || null, role: Story.role, cards: (S.cards || []).slice().sort(), done: (S.done || []).slice().sort(), chapter: S.chapter, clues: (S.clues || []).length, pos: Player.body.p.toArray().map((v) => +v.toFixed(1)), mode: Player.mode, cut: !!(typeof Cut !== 'undefined' && Cut.on), overlay: ['memory','letter','credits','pause'].filter((id) => !$(id).hidden) }; })())`;
const state = async (p) => JSON.parse(await p.ev(STATE));
const phaseOf = async (p) => p.ev('Story.S && Story.S.phase').catch(() => null);
const shot = async (name) => {
  const files = [];
  for (const p of both()) {
    const f = `${name}-${nm(p)}.png`;
    await p.shot(join(OUT, f)).catch(() => {});
    files.push(f);
  }
  return files;
};
const syncCheck = async (step) => {
  // the two pages are read one after the other: a state sent in between is not a disagreement,
  // so read again a few times before calling it one
  let a, b, same;
  for (let k = 0; k < 6; k++) {
    if (k) await sleep(700);
    a = await state(Y);
    b = await state(W);
    same = a.phase === b.phase && a.cards.join() === b.cards.join() && a.done.join() === b.done.join() && a.chapter === b.chapter;
    if (same) break;
  }
  const r = { t: clock(), step, phase: a.phase, same, yoline: a, william: b };
  J.syncs.push(r);
  jot(step, 'les deux', 'check', `phase/cartes/done/chapitre`, same ? `identiques (${a.phase}, ${a.cards.length} cartes, ${a.done.length} done, chapitre ${a.chapter})` : `DIFFÉRENTS Y=${JSON.stringify({ p: a.phase, c: a.cards.length, d: a.done.length, ch: a.chapter })} W=${JSON.stringify({ p: b.phase, c: b.cards.length, d: b.done.length, ch: b.chapter })}`);
  if (!same) J.bugs.push({ phase: curPhase, text: `désaccord entre les deux écrans après ${step}: ${JSON.stringify({ y: a, w: b }).slice(0, 400)}` });
  pullErrors();
  return { same, a, b };
};
const block = async (step, cause, extra = {}) => {
  const shots = await shot(`block-${J.blockers.length + 1}-${curPhase}`);
  const st = { yoline: await evs(Y, STATE), william: await evs(W, STATE) };
  const x = { yoline: await evs(Y, 'JSON.stringify(Story.S && Story.S.x).slice(0, 1500)'), william: await evs(W, 'JSON.stringify(Story.S && Story.S.x).slice(0, 1500)') };
  pullErrors();
  const b = { t: clock(), phase: curPhase, step, cause, shots, state: st, x, errors: J.errors.slice(-6), ...extra };
  J.blockers.push(b);
  jot(step, '-', 'check', 'BLOQUANT : ' + cause, shots.join(', '));
  return b;
};
// the notes the pages took while playing (lib.js CB.note)
const drain = async () => {
  for (const p of both()) {
    const ns = await p.ev('JSON.stringify(window.CB ? CB.drain() : [])').then(JSON.parse).catch(() => []);
    for (const n of ns) jot(n.phase || curPhase, `${nm(p)} (${n.kit})`, n.how, n.text);
  }
  // the simulated voice: what a solver says (CB.tell) reaches the partner's page (CB.heard)
  const [a, b] = both();
  for (const [p, o] of [[a, b], [b, a]]) {
    const said = await p.ev('JSON.stringify(window.CB && CB.out ? CB.out.splice(0) : [])').then(JSON.parse).catch(() => []);
    if (said.length) await o.ev(`(() => { if (window.CB && CB.heard) for (const [k, v] of ${JSON.stringify(said)}) CB.heard[k] = v; return 1; })()`).catch(() => {});
  }
};
// overlays a player closes with a key: a memory card (Enter), the letter once its button shows
const overlays = async () => {
  for (const p of both()) {
    const o = await p.ev(`JSON.stringify({ mem: !$('memory').hidden && !$('memory').classList.contains('flash'), letter: !$('letter').hidden && !$('letterBtn').hidden, pause: !$('pause').hidden })`).then(JSON.parse).catch(() => ({}));
    if (o.mem) {
      await sleep(1500);
      await key(p, 'Enter');
      jot('souvenir', nm(p), 'reelle', 'touche Entrée sur la carte souvenir', 'fermée');
    }
    if (o.letter) {
      await key(p, 'Enter');
      await sleep(800);
      jot('lettre', nm(p), 'reelle', 'touche Entrée sous la lettre (bouton affiché)', 'fermée');
    }
    if (o.pause) {
      await p.ev("$('btnResume').click(); 1").catch(() => {});
      J.bugs.push({ phase: curPhase, text: `${nm(p)} : le menu pause s'est ouvert tout seul (perte du verrou de pointeur)` });
      jot('pause', nm(p), 'reelle', 'clic sur Reprendre (pause ouverte toute seule)', '');
    }
  }
};
// wait until the host is in one of the phases (overlays handled meanwhile)
const waitPhase = async (want, ms) => {
  const set = Array.isArray(want) ? want : [want];
  const t = Date.now();
  while (Date.now() - t < ms) {
    const ph = await phaseOf(H());
    if (set.includes(ph)) return ph;
    await overlays();
    await sleep(500);
  }
  return null;
};
const bothIn = async (ph, ms = 30000) => (await Y.until(`Story.S && Story.S.phase === ${JSON.stringify(ph)}`, ms)) && (await W.until(`Story.S && Story.S.phase === ${JSON.stringify(ph)}`, ms));

// ---------------------------------------------------------------- save / resume
const saveOf = async () => JSON.parse(await H().ev("localStorage.getItem('borderline') || '{}'"));
const resumeCheck = async (label) => {
  const before = { y: await state(Y), w: await state(W) };
  const sv = await saveOf();
  writeFileSync(join(OUT, 'save.json'), JSON.stringify(sv, null, 1));
  const sp = sv.progress && sv.progress.phase;
  jot('reprise ' + label, 'les deux', 'reelle', `fermeture des deux pages (sauvegarde : ${sp}, ${(sv.progress && sv.progress.done || []).length} done)`);
  await closePages();
  pullErrors();
  const ok = await openPages();
  await H().ev('window.__test = true; 1');
  await G().ev('window.__test = true; 1');
  const ph = await waitPhase([sp], 60000);
  await bothIn(sp, 30000);
  await sleep(2500);
  const a = await state(Y);
  const b = await state(W);
  const good =
    ok && a.phase === sp && b.phase === sp &&
    a.cards.join() === before.y.cards.join() && b.cards.join() === before.w.cards.join() &&
    a.done.join() === before.y.done.join() && b.done.join() === before.w.done.join();
  const r = { label, saved: sp, before: before.y.phase, after: [a.phase, b.phase], cards: [a.cards.length, b.cards.length], done: [a.done.length, b.done.length], good };
  J.resumes.push(r);
  jot('reprise ' + label, 'les deux', 'check', `réouverture : Yoline ${a.phase} (${a.cards.length} cartes, ${a.done.length} done), William ${b.phase} (${b.cards.length}, ${b.done.length})`, good ? 'reprise identique' : 'REPRISE DIFFÉRENTE');
  if (!good) J.bugs.push({ phase: curPhase, text: `reprise ${label} : ${JSON.stringify(r)}` });
  if (before.y.phase !== sp) jot('reprise ' + label, '-', 'check', `la phase en cours était ${before.y.phase}, la sauvegarde dit ${sp} (point de reprise du jeu)`);
  return good;
};

// ---------------------------------------------------------------- the city
const cityPhases = new Set(['city']);
const doorEntry = (id) => `(() => { const t = Trials.byId[${JSON.stringify(id)}]; const d = City.doors[t.door || t.id]; return d && d.entry.toArray(); })()`;
// both walk to the lit door (by the path finder over the physics boxes, Input.sim)
const walkToDoor = async () => {
  const nx = await H().ev('JSON.stringify(Trials.next(Story.S.done))').then(JSON.parse);
  if (!nx) return null;
  const e = await H().ev(doorEntry(nx.id));
  jot('ville', 'les deux', 'reelle', `marche vers la porte ${nx.id} (${nx.title}, ${nx.card}) à ${e.map((v) => v.toFixed(1)).join(',')}`);
  const t = Date.now();
  const res = await Promise.all(
    both().map((p, i) =>
      p.ev(`(async () => { const e = V3(${e[0]}, ${e[1]}, ${e[2]}); const side = ${i ? 1 : -1}; const ok = await CB.go(V3(e.x + side * 0.9, e.y, e.z + side * 0.3), { near: 1.4, ms: 150000 }); return JSON.stringify({ ok, at: CB.where(), ph: Story.S.phase }); })()`).then(JSON.parse).catch((er) => ({ ok: false, err: er.message.slice(0, 200) })),
    ),
  );
  const ph = await waitPhase([nx.phase], 20000);
  jot('ville', 'les deux', 'reelle', `à la porte en ${Math.round((Date.now() - t) / 1000)} s`, ph ? `entrée dans ${ph} (Yoline ${JSON.stringify(res[0].at)}, William ${JSON.stringify(res[1].at)})` : `pas entrés: ${JSON.stringify(res)}`);
  return ph ? nx : { failed: true, nx, res };
};

// ---------------------------------------------------------------- levels
const solverFile = (ph) => join(HERE, 'levels', ph + '.js');
const kitsOk = async (ph) => {
  const ry = await Y.ev('Story.role');
  const rw = await W.ev('Story.role');
  const ey = await Y.ev(`Story.kitOf('yoline', ${JSON.stringify(ph)})`);
  const swap = await Y.ev(`(Trials.swap(${JSON.stringify(ph)}) || ['soleil','donjon','portes','act5'].includes(${JSON.stringify(ph)}))`);
  const ok = ry === ey && rw !== ry;
  const FPS = `new Promise((r) => { let n = 0; const t0 = performance.now(); const f = () => { n++; if (performance.now() - t0 < 1000) requestAnimationFrame(f); else r(n); }; requestAnimationFrame(f); })`;
  const fy = await Y.ev(FPS).catch(() => '?');
  const fw = await W.ev(FPS).catch(() => '?');
  const heap = await Y.ev('performance.memory ? Math.round(performance.memory.usedJSHeapSize / 1048576) : null').catch(() => null);
  jot('kits', 'les deux', 'check', `Yoline=${ry}, William=${rw} (plan : ${swap ? 'kits échangés' : 'kits de base'}) · ${fy} / ${fw} images/s, tas ${heap} Mo`, ok ? 'conformes' : 'NON CONFORMES');
  if (!ok) J.bugs.push({ phase: ph, text: `kits ${ry}/${rw}, attendu Yoline=${ey}` });
  return ok;
};
// play a level until the host leaves it for `until` (reward by default)
const playLevel = async (ph, until = ['reward', 'cut']) => {
  curPhase = ph;
  const t = Date.now();
  const nCut0 = J.entries.filter((e) => e.how === 'raccourci').length;
  await bothIn(ph, 30000);
  await kitsOk(ph);
  // let the level build and its intro start
  await H().ev('__qa.settle(1200, 30000)').catch(() => 0);
  await G().ev('__qa.settle(1200, 30000)').catch(() => 0);
  let how = 'solveur';
  let result = '';
  if (!existsSync(solverFile(ph))) {
    how = 'raccourci';
    await shortcutWin(ph, 'pas de solveur écrit pour ce niveau');
  } else {
    const src = readFileSync(solverFile(ph), 'utf8');
    for (const p of both()) await p.ev(LIB + ';' + src + ';1');
    const timeout = Math.min(CAP, await H().ev('(window.CL && CL.timeout) || 600')) * 1000;
    jot('solveur', 'les deux', 'check', `solveur levels/${ph}.js lancé sur les deux pages (délai ${timeout / 1000} s)`);
    const runs = both().map((p) =>
      p.ev('(async () => { try { return String(await CL.run()); } catch (e) { return "EXC " + (e && e.stack || e); } })()').catch((e) => 'CDP ' + e.message.slice(0, 200)),
    );
    const done = { y: null, w: null };
    runs[0].then((r) => (done.y = r));
    runs[1].then((r) => (done.w = r));
    let left = null;
    while (Date.now() - t < timeout) {
      const p = await phaseOf(H());
      if (p !== ph) {
        left = p;
        break;
      }
      await drain();
      await overlays();
      pullErrors();
      if (done.y !== null && done.w !== null) {
        // both solvers returned but the level is not over: give the host a moment
        const p2 = (await waitPhase(until.concat(['city']), 15000)) || null;
        if (p2) left = p2;
        break;
      }
      await sleep(1000);
    }
    await drain();
    jot('solveur', 'Yoline', 'check', 'fin du solveur', done.y === null ? '(encore en cours)' : String(done.y).slice(0, 600));
    jot('solveur', 'William', 'check', 'fin du solveur', done.w === null ? '(encore en cours)' : String(done.w).slice(0, 600));
    // stop the solvers' hands
    for (const p of both()) await p.ev('window.CL && (CL.abort = true); Input.sim.x = 0; Input.sim.z = 0; Input.sim.held.clear(); 1').catch(() => {});
    if (!left || !until.includes(left)) {
      const b = await block('niveau ' + ph, left ? `sorti vers ${left} au lieu de ${until.join('/')}` : `pas fini ${done.y !== null && done.w !== null ? 'quand les deux solveurs se sont arrêtés, après ' + Math.round((Date.now() - t) / 1000) + ' s' : 'en ' + Math.round(timeout / 1000) + ' s'} (solveurs : Yoline « ${String(done.y).slice(0, 200)} », William « ${String(done.w).slice(0, 200)} »)`);
      how = 'solveur + raccourci';
      if (!left && (await phaseOf(H())) === ph) await shortcutWin(ph, 'continuer après le blocage ' + J.blockers.length);
    }
  }
  const nCut = J.entries.filter((e) => e.how === 'raccourci').length - nCut0;
  const end = await waitPhase(until.concat(['city', 'cut']), 30000);
  result = end ? `→ ${end}` : 'ne sort pas';
  J.levels.push({ phase: ph, secs: Math.round((Date.now() - t) / 1000), how, shortcuts: nCut, result });
  flush();
  return end;
};
const shortcutWin = async (ph, why) => {
  const id = await H().ev(`(Trials.byPhase[${JSON.stringify(ph)}] || {}).id || null`);
  if (id) {
    await H().ev(`Story.goto('reward', (s) => (s.x.card = ${JSON.stringify(id)})); 1`);
    jot('niveau ' + ph, 'hôte', 'raccourci', `Story.goto('reward') pour ${id} : ${why}`);
  } else {
    const nextOf = { act3: 'act4', act4: 'act5', act5: 'final', final: 'epilogue', epilogue: 'credits' }[ph];
    await H().ev(`Story.goto(${JSON.stringify(nextOf)}); 1`);
    jot('niveau ' + ph, 'hôte', 'raccourci', `Story.goto('${nextOf}') : ${why}`);
  }
};

// the reward screen: the card is awarded on both pages, then the city or a film
const reward = async () => {
  curPhase = 'reward';
  const card = await H().ev('Story.S.x.card');
  const exp = await H().ev(`Cards.rewardOf(${JSON.stringify(card)})`);
  await sleep(3000);
  const ok = (await Y.until(`${JSON.stringify(exp)}.every((c) => Story.S.cards.includes(c)) && Story.S.done.includes(${JSON.stringify(card)})`, 15000)) && (await W.until(`${JSON.stringify(exp)}.every((c) => Story.S.cards.includes(c)) && Story.S.done.includes(${JSON.stringify(card)})`, 15000));
  jot('récompense', 'les deux', 'attente', `écran de la carte ${exp.join(',')} (épreuve ${card})`, ok ? 'carte et épreuve comptées sur les deux pages' : 'CARTE ABSENTE sur un écran');
  if (!ok) J.bugs.push({ phase: 'reward', text: `carte ${exp} de ${card} absente d'un écran` });
  const next = await waitPhase(['city', 'cut'], 60000);
  jot('récompense', 'hôte', 'attente', 'fin de l’écran', next ? '→ ' + next : 'BLOQUÉ');
  return next;
};
// a film: each player holds E (real key events through CDP) until it is skipped
const film = async (skip = true) => {
  curPhase = 'cut';
  const id = await H().ev('Story.S.x.cut');
  const after = await H().ev('Story.S.x.after');
  await bothIn('cut', 20000);
  await sleep(2500);
  if (skip) {
    for (const p of both()) {
      await p.send('Input.dispatchKeyEvent', { type: 'keyDown', code: 'KeyE', key: 'e', windowsVirtualKeyCode: 69 });
    }
    await sleep(2200);
    for (const p of both()) await p.send('Input.dispatchKeyEvent', { type: 'keyUp', code: 'KeyE', key: 'e', windowsVirtualKeyCode: 69 });
    jot('film ' + id, 'les deux', 'reelle', 'E maintenu 2,2 s sur chaque écran (passer)');
  }
  const ph = await waitPhase([after, 'city'], skip ? 30000 : 300000);
  jot('film ' + id, 'hôte', 'attente', `fin du film, suite prévue ${after}`, ph ? '→ ' + ph : 'BLOQUÉ');
  if (!ph) await block('film ' + id, 'le film ne se termine pas après le passage des deux joueurs');
  return ph;
};

// ---------------------------------------------------------------- the prologue
const prologue = async () => {
  curPhase = 'prologue';
  const a = await state(Y);
  const b = await state(W);
  jot('prologue', 'les deux', 'check', `départ : Yoline ${JSON.stringify(a.pos)}, William ${JSON.stringify(b.pos)}`);
  // they look for each other: both walk to the plaza by the streets
  const res = await Promise.all(
    both().map((p, i) => p.ev(`(async () => { const ok = await CB.go(V3(${i ? 1.6 : -1.6}, 0, 8), { near: 1, ms: 200000 }); return JSON.stringify({ ok, at: CB.where() }); })()`).then(JSON.parse)),
  );
  const ph = await waitPhase(['welcome', 'city'], 20000);
  jot('prologue', 'les deux', 'reelle', 'chacun marche (stick simulé) jusqu’à la place par les rues', ph ? `retrouvés → ${ph} (${JSON.stringify(res)})` : 'PAS RETROUVÉS');
  if (!ph) await block('prologue', 'les deux joueurs côte à côte sur la place, mais pas de welcome');
  const c = await waitPhase(['city'], 180000);
  jot('welcome', 'hôte', 'attente', 'l’écran géant parle, la boîte tombe', c ? '→ city' : 'BLOQUÉ');
  return c;
};

// ---------------------------------------------------------------- the story finale
// the memory the city marks (js/levels/city.js placeNow): the newest world memory not looked at
// yet, else the last one (danse) once every épreuve is done
const MEMORY = `(() => { const ws = Lore.completed(Story.S.done).map((w) => w.memory); const nw = ws[ws.length - 1]; if (nw && !Story.S.seen.includes(nw)) return nw; return Trials.next(Story.S.done) ? null : 'danse'; })()`;
// both walk to it and press E when the screen offers « Regarder » (the memory card is closed with Enter)
const lookMemory = async (id) => {
  const e = await H().ev(`City.places[${JSON.stringify(id)}].entry.toArray()`);
  jot('souvenir ' + id, 'les deux', 'reelle', `marche vers le souvenir « ${id} » à ${e.map((v) => v.toFixed(1))}`);
  const res = await Promise.all(
    both().map((p, i) =>
      p
        .ev(`(async () => { const e = V3(${e[0]}, 0, ${e[2]}); await CB.go(V3(e.x + ${i ? 0.8 : -0.8}, 0, e.z + 0.6), { near: 1.2, ms: 150000 }); await CB.sl(400); const pr = $('prompt') ? $('prompt').textContent : ''; if (/Regarder/.test(pr)) await CB.tap('interact'); CB.note('reelle', 'E devant le souvenir ${id} (invite « ' + pr + ' »)'); return JSON.stringify({ at: CB.where(), d: +Math.hypot(Player.body.p.x - e.x, Player.body.p.z - e.z).toFixed(2), pr }); })()`)
        .then(JSON.parse)
        .catch((er) => ({ err: er.message.slice(0, 120) })),
    ),
  );
  await sleep(1500);
  await overlays();
  await sleep(1000);
  await overlays();
  await drain();
  const seen = await H().ev(`Story.S.seen.includes(${JSON.stringify(id)})`);
  jot('souvenir ' + id, 'hôte', 'check', `positions ${JSON.stringify(res)}`, seen ? 'regardé' : 'PAS regardé');
  return seen;
};
const finale = async () => {
  curPhase = 'city';
  let ph = null;
  for (let tries = 1; tries <= 5 && !ph; tries++) {
    const id = await H().ev(MEMORY);
    if (id) await lookMemory(id);
    if (id === 'danse' || !id) {
      ph = await waitPhase(['act3'], 45000);
      const by = await H().ev('JSON.stringify(Story.S.x.lastBy || Story.S.x.seenBy || [])');
      jot('dernier souvenir', 'hôte', 'attente', `vu par ${by}, le banc compte`, ph ? '→ act3' : 'pas encore');
      if (!ph) {
        // the last memory was never put in the city (City.places.danse.shown false): known city bug,
        // a re-entry of the city shows it. Shortcut: both pages reloaded (the game's own resume)
        const shown = [await Y.ev('City.places.danse.shown'), await W.ev('City.places.danse.shown')];
        if (!shown[0] || !shown[1]) {
          await block('dernier souvenir', `le dernier souvenir « danse » n’est pas affiché dans la ville (shown Yoline ${shown[0]}, William ${shown[1]}) alors que l’objectif l’annonce : impossible de le regarder`);
          jot('dernier souvenir', 'les deux', 'raccourci', 'rechargement des deux pages : la ville, réouverte, affiche le dernier souvenir');
          await closePages();
          await openPages();
          await H().ev('window.__test = true; 1');
          await G().ev('window.__test = true; 1');
          await waitPhase(['city'], 60000);
          await sleep(3000);
        }
      }
    }
  }
  return ph;
};

// ---------------------------------------------------------------- start-from (labelled shortcut)
const PLAN_PHASES = async () => H().ev('JSON.stringify(Trials.list.filter(Trials.built).map((t) => [t.id, t.phase, t.card]))').then(JSON.parse);
const startFrom = async (ph) => {
  if (RESUME) {
    const sv = JSON.parse(readFileSync(join(resolve(RESUME), 'save.json'), 'utf8'));
    await Y.go(`${base}index.html?nothing=1`);
    await Y.until('document.readyState === "complete"', 20000);
    await Y.ev(`localStorage.setItem('borderline', ${JSON.stringify(JSON.stringify(sv))}); 1`);
    jot('départ', '-', 'raccourci', `sauvegarde d’une course précédente remise (${RESUME}) : ${sv.progress && sv.progress.phase}, ${(sv.progress && sv.progress.done || []).length} done`);
    return;
  }
  // a save where every épreuve before `ph` is done (story phases: all of them)
  const plan = await (async () => {
    await H().go(`${base}index.html?local=tmp${room}&role=${HOST}&host=1&auto=1&nointro=1`);
    await H().until('typeof Trials !== "undefined" && typeof Story !== "undefined" && Story.has("tr_s1")', 60000);
    return PLAN_PHASES();
  })();
  const i = plan.findIndex((t) => t[1] === ph);
  const done = (i < 0 ? plan : plan.slice(0, i)).map((t) => t[0]);
  const story = { act5: [], final: ['d1', 's1', 'c1'], epilogue: ['d1', 's1', 'c1', 'h1'] }[ph] || [];
  const prog = { v: 5, phase: i < 0 ? ph : ph, chapter: done.length, done, clues: [], seen: [], cards: [...plan.filter((t) => done.includes(t[0])).map((t) => t[2]), ...story] };
  await H().ev(`localStorage.setItem('borderline', JSON.stringify({ ...(JSON.parse(localStorage.getItem('borderline') || '{}')), progress: ${JSON.stringify(prog)} })); 1`);
  jot('départ', '-', 'raccourci', `départ demandé à ${ph} (--from) : sauvegarde écrite avec ${done.length} épreuves faites`);
};

// ---------------------------------------------------------------- main
const RESUME_AT = {
  // W1 mid: after the third épreuve of world 1, in the city
  w1mid: (s) => s.phase === 'city' && s.done.length === 3,
  // after a world change: the first épreuve of world 2, once entered
  world: (s) => s.phase === 'tr_c1',
  // inside the Cour: in the first face
  cour: (s) => s.phase === 'tr_sV',
  // before act5: at the start of act5
  act5: (s) => s.phase === 'act5',
};
const resumed = new Set();
const maybeResume = async () => {
  if (!RESUME_CHECKS) return;
  const s = await state(H());
  for (const [k, f] of Object.entries(RESUME_AT)) {
    if (resumed.has(k) || !f(s)) continue;
    resumed.add(k);
    // in a level: let the host save it first (it saves every 2 s)
    await sleep(3500);
    await resumeCheck(k);
  }
};

let ended = null;
try {
  J.args = process.argv.slice(2);
  const okOpen = await (async () => {
    if (FROM) {
      Y = await chrome.page('Y', null);
      W = await chrome.page('W', null);
      await startFrom(FROM);
      await closePages();
    }
    return openPages();
  })();
  jot('ouverture', 'les deux', 'check', `Yoline ${HOST === 'yoline' ? 'hôte' : 'invitée'}, William ${HOST === 'william' ? 'hôte' : 'invité'} (salle ${room})`, okOpen ? 'connectés' : 'PAS CONNECTÉS');
  if (!okOpen) throw new Error('pages did not start');
  await H().ev('window.__test = true; 1');
  await G().ev('window.__test = true; 1');
  const s0 = await state(H());
  jot('ouverture', 'hôte', 'check', `phase de départ ${s0.phase}, ${s0.cards.length} cartes, ${s0.done.length} épreuves faites`);

  let guard = 0;
  while (guard++ < 400) {
    pullErrors();
    const ph = await phaseOf(H());
    curPhase = ph;
    if (STOP && J.levels.some((l) => l.phase === STOP)) {
      ended = 'arrêt demandé après ' + STOP;
      break;
    }
    if (ph === 'prologue') {
      if (!(await prologue())) break;
      continue;
    }
    if (ph === 'welcome') {
      await waitPhase(['city'], 180000);
      continue;
    }
    if (ph === 'city') {
      await sleep(2500);
      await overlays();
      await syncCheck('retour en ville');
      await maybeResume();
      const nx = await H().ev('JSON.stringify(Trials.next(Story.S.done))').then(JSON.parse);
      // a world finished: its memory is marked in the city, the players look at it first
      if (nx) {
        const mem = await H().ev(MEMORY);
        if (mem) await lookMemory(mem);
      }
      if (!nx) {
        if (!(await finale())) {
          await block('dernier souvenir', 'act3 ne démarre pas après le souvenir « danse »');
          break;
        }
        continue;
      }
      if (ONLY && !ONLY.includes(nx.phase)) {
        // not under test in this run: labelled shortcut through the level
        await H().ev(`Story.goto('reward', (s) => (s.x.card = ${JSON.stringify(nx.id)})); 1`);
        jot('ville', 'hôte', 'raccourci', `${nx.phase} sauté (--only)`);
        await waitPhase(['reward'], 10000);
        continue;
      }
      const r = await walkToDoor();
      if (!r || r.failed) {
        await block('porte ' + (nx && nx.id), 'les deux joueurs n’entrent pas par la porte allumée', { res: r && r.res });
        // shortcut: put them at the door (a respawn), or else enter
        for (const [i, p] of both().entries())
          await p.ev(`(() => { const e = V3(...${JSON.stringify(await H().ev(doorEntry(nx.id)))}); CB.tp(V3(e.x + ${i ? 0.8 : -0.8}, 0, e.z), 'la marche vers la porte a échoué'); return 1; })()`);
        await drain();
        if (!(await waitPhase([nx.phase], 10000))) {
          await H().ev(`Story.goto(${JSON.stringify(nx.phase)}); 1`);
          jot('porte', 'hôte', 'raccourci', `Story.goto('${nx.phase}') : la porte ne s’ouvre pas`);
        }
      }
      continue;
    }
    if (ph === 'reward') {
      if (!(await reward())) {
        await block('récompense', 'l’écran de récompense ne se termine pas');
        // shortcut: both pages reloaded (a save made during the reward resumes it once more)
        jot('récompense', 'les deux', 'raccourci', 'rechargement des deux pages pour sortir de l’écran bloqué');
        await closePages();
        await openPages();
        await H().ev('window.__test = true; 1');
        await G().ev('window.__test = true; 1');
        const nx = await waitPhase(['city', 'cut'], 90000);
        jot('récompense', 'hôte', 'attente', 'après rechargement', nx ? '→ ' + nx : 'TOUJOURS BLOQUÉ');
        if (!nx) break;
      }
      continue;
    }
    if (ph === 'cut') {
      if (!(await film())) break;
      continue;
    }
    if (ph === 'credits') {
      curPhase = 'credits';
      await bothIn('credits', 20000);
      const vis = await Y.ev("!$('credits').hidden") && (await W.ev("!$('credits').hidden"));
      await shot('credits');
      jot('générique', 'les deux', 'check', 'le générique défile', vis ? 'affiché sur les deux écrans' : 'PAS AFFICHÉ');
      ended = vis ? 'générique atteint' : 'phase credits sans générique';
      break;
    }
    if (['act3', 'act4', 'act5', 'final', 'epilogue'].includes(ph)) {
      if (ph === 'act5') await maybeResume();
      const nextOf = { act3: 'act4', act4: 'act5', act5: 'final', final: 'epilogue', epilogue: 'credits' }[ph];
      const end = await playLevel(ph, [nextOf]);
      await syncCheck('après ' + ph);
      if (!end) break;
      continue;
    }
    if (ph && (await H().ev(`!!Trials.byPhase[${JSON.stringify(ph)}]`))) {
      await maybeResume();
      const end = await playLevel(ph);
      await syncCheck('après ' + ph);
      if (!end) break;
      continue;
    }
    // a short phase of the story between a film and the reward (tr_dKw): it moves on by itself
    if (ph && (await H().ev(`Story.has(${JSON.stringify(ph)})`))) {
      const nx = await waitPhase(['reward', 'city'], 60000);
      jot('phase ' + ph, 'hôte', 'attente', 'phase de liaison', nx ? '→ ' + nx : 'BLOQUÉ');
      if (nx) continue;
    }
    await block('phase ' + ph, 'phase inattendue');
    break;
  }
  if (!ended) ended = 'arrêté en ' + (await phaseOf(H()).catch(() => '?'));
} catch (e) {
  ended = 'exception : ' + (e.stack || e).toString().slice(0, 600);
  console.error(e);
} finally {
  pullErrors();
  J.end = ended;
  J.finished = new Date().toISOString();
  jot('fin', '-', 'check', ended);
  flush();
  await chrome.close();
  srv.close();
}
console.log('\njournal:', join(OUT, 'journal.md'));
process.exit(/générique atteint/.test(ended) ? 0 : 1);
