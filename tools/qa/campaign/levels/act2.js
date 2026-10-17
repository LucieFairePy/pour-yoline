// ♣ Le Labyrinthe noir (act2) — solver. Base kits ('dame' guides first, 'valet' walks first).
//  1 the valet walks the dark maze m1; the dame sees it from the deck and calls the turns
//    (the route is the maze's open path: what the guide sees)
//  2 the bomb: the valet reads symbol + number on the bomb screen, the dame reads the manual on
//    the lectern (E); the valet cuts the wire the manual names (E by that wire), three modules
//  3 swapped: the dame walks maze m2 in the dark, the valet guides
//  4 both to the card
window.CL = {
  timeout: 600,
  async run() {
    const PH = 'act2';
    const W = Maze;
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
    const CELL = 3.2;
    // the open path from the entry cell to the exit cell (what the guide sees from the deck)
    const route = (key) => {
      const m = W.mazes[key];
      const n = m.n;
      const mid = (n / 2) | 0;
      const prev = new Map([[mid + ',0', null]]);
      const q = [[mid, 0]];
      while (q.length) {
        const [a, b] = q.shift();
        if (a === mid && b === n - 1) break;
        const c = m.at(a, b);
        [[a, b + 1, 'n'], [a + 1, b, 'e'], [a, b - 1, 's'], [a - 1, b, 'w']].forEach(([u, v, d]) => {
          if (u < 0 || v < 0 || u >= n || v >= n || c[d] || prev.has(u + ',' + v)) return;
          prev.set(u + ',' + v, [a, b]);
          q.push([u, v]);
        });
      }
      const out = [];
      let k = [mid, n - 1];
      while (k) {
        out.unshift([m.x0 + k[0] * CELL + CELL / 2, 0, m.z0 + k[1] * CELL + CELL / 2]);
        k = prev.get(k[0] + ',' + k[1]);
      }
      out.unshift([m.x0 + mid * CELL + CELL / 2, 0, m.z0 - 1]);
      out.push([m.x0 + mid * CELL + CELL / 2, 0, m.z0 + n * CELL + 1.5]);
      return out;
    };
    const walkMaze = async (key) => {
      const r = route(key);
      B.note('reelle', 'labyrinthe ' + key + ' dans le noir, guidé·e à la voix (' + r.length + ' points de passage, le guide voit le labyrinthe)');
      for (const p of r) {
        if (!live()) return 'interrompu';
        if (!(await B.walk(p, 0.35, 8000))) return 'bloqué·e à ' + B.rel();
      }
      return 'sorti·e ' + B.rel();
    };
    // the manual's rule (read on the lectern by the dame)
    const answer = (sym, n) =>
      sym === '♥' ? (n % 2 === 0 ? 0 : 1) : sym === '♠' ? (n < 5 ? 2 : 3) : sym === '♦' ? (n % 3 === 0 ? 1 : 2) : n % 2 === 0 ? 3 : 0;
    const cut = async (i) => {
      await B.walk([W.WIRE_X[i], 0, W.BOMB.z - 1.3], 0.15, 5000);
      B.face([W.WIRE_X[i], 0, W.BOMB.z]);
      await B.sl(200);
      await B.tap('interact');
      await B.sl(900);
    };

    const st1 = async () => {
      if (dame) return (await wait(() => x().stage >= 2, 120000)) ? 'guide ok' : 'guide : attente';
      const r = await walkMaze('m1');
      return (await wait(() => x().stage >= 2, 10000)) ? 'st1 ok ' + r : 'st1 ' + r;
    };
    const st2 = async () => {
      if (dame) {
        // open the manual on the lectern (deck of tower 1)
        await B.walk([2.6, 17, 11.8], 0.8, 10000);
        if (W.nearLectern(W.rel(Player.body.p))) {
          await B.tap('interact');
          B.note('reelle', 'manuel ouvert au pupitre (E)');
        }
        const r = await wait(() => x().stage >= 3, 180000);
        if (W.nearLectern(W.rel(Player.body.p)) && x().stage === 2) await B.tap('interact');
        return r ? 'manuel ok' : 'bombe : attente';
      }
      await B.walk([0, 0, 35.5], 0.5, 15000);
      for (let k = 0; k < 8 && live() && x().stage === 2; k++) {
        const b = x().bomb;
        const i = answer(b.sym, b.num);
        B.note('reelle', 'bombe ' + b.sym + ' ' + b.num + ' (écran) → fil ' + ['rose', 'or', 'bleu', 'blanc'][i] + ' (manuel lu par la Dame)');
        await cut(i);
        await wait(() => x().stage !== 2 || x().bomb !== b, 3000);
      }
      return x().stage >= 3 ? 'bombe désamorcée (explosions ' + x().booms + ')' : 'bombe pas finie r' + x().bomb.round;
    };
    const st3 = async () => {
      await B.sl(1500);
      if (!dame) return (await wait(() => x().stage >= 4, 120000)) ? 'guide ok' : 'guide : attente';
      const r = await walkMaze('m2');
      return (await wait(() => x().stage >= 4, 10000)) ? 'st3 ok ' + r : 'st3 ' + r;
    };
    const st4 = async () => {
      await B.sl(1500);
      await B.walk([dame ? -1 : 1, 0, 80], 0.6, 20000);
      B.note('reelle', 'à la carte');
      await wait(() => false, 10000);
      return live() ? 'pas fini ' + B.rel() : 'won';
    };

    const ST = { 1: st1, 2: st2, 3: st3, 4: st4 };
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
