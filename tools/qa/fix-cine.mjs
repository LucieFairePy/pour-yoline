// cine.html (the intro film's page, for recording it) loads without an exception and renders
// frames. Before the fix it did not include js/world/look.js (nor js/core/assets.js, which Look
// reads), so city.js threw « Look is not defined » and everything after it (City, the screens)
// was missing.
//   node tools/qa/fix-cine.mjs [--port 8864 --cdp 9434 --root <checkout>]
import { run } from './fix-kit.mjs';

run('cine', async ({ chrome, base, sleep, log }) => {
  const C = await chrome.page('C', null);
  const n = chrome.errors.length;
  await C.go(base + 'cine.html');
  const loaded = await C.until("typeof CINE !== 'undefined' && typeof Intro !== 'undefined'", 60000);
  await sleep(4000);
  let frames = 0;
  for (const t of [1, 8, 20, 40]) {
    const ok = await C.ev(`CINE.frame(${t}) === true`).catch(() => false);
    if (ok) frames++;
    await sleep(300);
  }
  // (typeof throws on a const whose script failed before declaring it)
  const defined = await C.ev("JSON.stringify(Object.fromEntries(['Look', 'City', 'BigScreen'].map((k) => { try { return [k, typeof eval(k)]; } catch (e) { return [k, 'not defined']; } })))");
  const errs = chrome.errors.slice(n).filter((e) => e.page === 'C');
  log('cine.html', defined, 'frames', frames, 'errors', JSON.stringify(errs.map((e) => e.text.slice(0, 120))));
  return { ok: loaded && frames === 4 && !errs.length, defined: JSON.parse(defined), frames, notes: errs.length ? errs[0].text.slice(0, 160) : 'loads and renders' };
});
