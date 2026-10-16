// ♠ Un, deux, trois, Soleil (soleil) — solver. Kits swapped by the plan (Yoline carries 'valet');
// everything keys on Story.role.
//  1 the field: walk only while the doll sings. Past zone 1 the only warning is the doll's eyes,
//    which only the 'dame' screen shows (she calls it out); in zone 3 the dame is always watched
//    and must walk in the valet's shadow (the valet in front, between her and the doll's eye)
//  2 both touch the doll within 3 s (E)
//  3 both to the card
window.CL = {
  timeout: 600,
  async run() {
    const PH = 'soleil';
    const W = Soleil;
    B.W = W;
    const S = Input.sim;
    const x = () => Story.S.x;
    const dame = Story.role === 'dame';
    const live = () => !CL.abort && Story.S && Story.S.phase === PH;
    const wait = async (fn, ms = 20000) => {
      await B.until(() => !live() || fn(), ms);
      try {
        return live() && !!fn();
      } catch (e) {
        return false;
      }
    };
    const log = [];

    const field = async (ms = 300000) => {
      let n = -1;
      let t0 = 0;
      let caught = 0;
      let lastZ = -1e9;
      const st = performance.now();
      B.note(
        'reelle',
        dame
          ? 'terrain : avance pendant la chanson, s’arrête quand les yeux de la Poupée s’allument (visibles sur son écran)'
          : 'terrain : avance pendant la chanson, s’arrête à l’annonce de la Dame (les yeux ne sont visibles que sur son écran)',
      );
      while (live() && performance.now() - st < ms && x().stage === 1) {
        const d = x().d;
        if (d.n !== n) {
          n = d.n;
          t0 = performance.now();
        }
        const el = (performance.now() - t0) / 1000;
        const q = W.rel(Player.body.p);
        if (q.z < lastZ - 3) caught++;
        lastZ = q.z;
        // the eyes light 0.9 s before a real turn: stop then; a fake turn is over after 0.45 s
        let go = (d.ph === 'sing' && !(d.real && d.dur - el < 0.7)) || (d.ph === 'fake' && el > 0.6);
        if (Player.mode === 'frozen') go = false;
        const done = q.z > W.LINES[3] + 1.5;
        let tgt = [dame ? -3 : 3, 0, 89];
        if (q.z > W.LINES[2] - 6) {
          // zone 3: the valet walks in front on x=0, the dame right behind it, in its shadow
          const rp = W.rel(Remote.pos);
          if (dame) {
            const shade = Math.abs(q.x - rp.x) < 0.8 && rp.z - q.z > 0.6 && rp.z - q.z < 5;
            if (rp.z < W.LINES[2] + 1.2) tgt = [rp.x, 0, Math.min(W.LINES[2] - 0.6, rp.z - 2)];
            else tgt = [rp.x, 0, rp.z - 1.8];
            if (q.z > W.LINES[2] - 0.3 && !shade) go = false;
          } else {
            tgt = [0, 0, 89];
            const shade = Math.abs(q.x - rp.x) < 0.8 && q.z - rp.z > 0.6 && q.z - rp.z < 3.2;
            if (q.z > W.LINES[2] + 1.5 && !shade) go = false;
          }
        }
        if (done) go = false;
        if (go) {
          B.face(tgt);
          B.steer(B.abs(tgt));
        } else {
          S.x = 0;
          S.z = 0;
        }
        await B.sl(40);
      }
      B.stop();
      return 'terrain fini (attrapé·e ' + caught + ' fois) ' + JSON.stringify(B.rel());
    };

    const st1 = async () => {
      const r = await field();
      B.note('reelle', r);
      return (await wait(() => x().stage >= 2, 60000)) ? r : 'st1 attente ' + r;
    };
    const st2 = async () => {
      await B.walk([dame ? -1.5 : 1.5, 0, 93.5], 0.5, 15000);
      for (let i = 0; i < 12 && live() && x().stage === 2; i++) {
        await B.tap('interact');
        await B.sl(600);
      }
      if (x().stage === 2) return 'Poupée pas réveillée';
      B.note('reelle', 'Poupée touchée ensemble (E)');
      return 'st2 ok';
    };
    const st3 = async () => {
      await B.walk([dame ? -1 : 1, 0, 90], 0.5, 10000);
      B.note('reelle', 'à la carte');
      await wait(() => false, 12000);
      return live() ? 'pas fini ' + B.rel() : 'won';
    };

    const ST = { 1: st1, 2: st2, 3: st3 };
    let last = null;
    let same = 0;
    while (live()) {
      const st = x().stage;
      if (st === last && ++same > 3) {
        log.push('bloqué à l’étape ' + st);
        break;
      }
      if (st !== last) same = 0;
      last = st;
      const fn = ST[st];
      if (!fn) {
        await B.sl(500);
        continue;
      }
      log.push(await fn());
      B.stop();
      S.held.clear();
      if (live() && x().stage === st) await wait(() => x().stage !== st, 8000);
    }
    return Story.role + ': ' + log.join(' / ');
  },
};
