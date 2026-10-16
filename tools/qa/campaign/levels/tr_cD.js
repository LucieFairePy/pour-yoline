// tr_cD · La Dame de Trèfle: the carriage over the pit. Ride 0: the valet kit rides, the dame kit
// drives at the console; ride 1 the other way round. The rider walks onto the docked carriage at the
// quay (rel 0, 57.4) and presses E next to a medallion (update() sends {a:'grab', i}); the operator
// walks to the console (rel -11.3, 73), presses E to take the cranks and steers with the stick
// (update() sends {a:'steer'}), one axis at a time along a path clear of the beams.
// Only the rider sees the medallions; in a real game the rider guides the operator by voice: the
// operator bot reads their positions (W.dbgD.tokens), labelled raccourci.
// At the end both walk to the card (rel 0, 50).
window.CL = {
  timeout: 900,
  async run() {
    const W = CourC;
    B.W = W;
    const S = Input.sim;
    const L = W.dbgD.local;
    const X = () => Story.S.x;
    const live = () => !CL.abort && Story.S && Story.S.phase === 'tr_cD';
    const me = () => Story.role;
    const pos = () => Player.body.p;
    const docked = () => Math.abs(W.ST.car.z - W.CAR.z0) < 0.08 && Math.abs(W.ST.car.y) < 0.08 && !L.home;
    const steer = (sz, sy) => {
      S.x = -sz;
      S.z = sy;
    };
    // the floors: the hall z 44..56 (x -14..14), the side galleries x -14..-9 / 9..14 along the pit
    const toQuay = async () => {
      const q = W.rel(pos());
      if (q.x < -8.5 && q.z > 56) await B.walk([-11.5, 0, 54], 0.5, 20000, true);
      await B.walk([0, 0, 54.2], 0.4, 20000, true);
    };
    const toConsole = async () => {
      const q = W.rel(pos());
      if (W.onCar(pos())) {
        // still aboard (the swap): wait for the carriage back at the quay before stepping off
        await B.until(() => docked() || !live(), 60000, 100);
        await B.walk([0, 0, 54.2], 0.4, 8000);
      }
      if (q.x > -8.5) await B.walk([-11.5, 0, 54], 0.5, 20000, true);
      await B.walk([W.CONSOLE.op[0], 0, W.CONSOLE.op[1]], 0.4, 20000, true);
    };
    // the carriage cells free of the beams (rider 2.1 m tall), BFS with axis moves
    const STEP = 0.4;
    const NZ = Math.round((W.CAR.z1 - W.CAR.z0) / STEP);
    const NY = Math.round((W.CAR.y1 - W.CAR.y0) / STEP);
    const cz = (i) => W.CAR.z0 + i * STEP;
    const cy = (j) => W.CAR.y0 + j * STEP;
    const free = (i, j) => i >= 0 && j >= 0 && i <= NZ && j <= NY && !W.carHits(cz(i), cy(j));
    const path = (from, goal) => {
      const fi = Math.round((from.z - W.CAR.z0) / STEP);
      const fj = Math.round((from.y - W.CAR.y0) / STEP);
      const prev = new Map();
      const q = [[fi, fj]];
      prev.set(fi + ',' + fj, null);
      while (q.length) {
        const [i, j] = q.shift();
        if (goal(cz(i), cy(j))) {
          const out = [];
          let k = i + ',' + j;
          while (k) {
            const [a, b] = k.split(',').map(Number);
            out.unshift([cz(a), cy(b)]);
            k = prev.get(k);
          }
          return out;
        }
        for (const [di, dj] of [[0, 1], [0, -1], [1, 0], [-1, 0]]) {
          const n = [i + di, j + dj];
          const k = n[0] + ',' + n[1];
          if (!prev.has(k) && free(n[0], n[1])) {
            prev.set(k, i + ',' + j);
            q.push(n);
          }
        }
      }
      return null;
    };
    const driveTo = async (z, y) => {
      for (let k = 0; k < 500 && live(); k++) {
        if (L.home || !L.driving) {
          steer(0, 0);
          return false;
        }
        const dz = z - W.ST.car.z;
        const dy = y - W.ST.car.y;
        if (Math.abs(dz) < 0.12 && Math.abs(dy) < 0.12) {
          steer(0, 0);
          return true;
        }
        steer(Math.abs(dz) >= 0.12 ? Math.sign(dz) : 0, Math.abs(dz) < 0.12 && Math.abs(dy) >= 0.12 ? Math.sign(dy) : 0);
        await B.sl(Math.abs(dz) > 0.6 || Math.abs(dy) > 0.6 ? 60 : 25);
      }
      steer(0, 0);
      return false;
    };
    let lastRole = '';
    let grabs = 0;
    const noted = {};
    const t0 = performance.now();
    while (live() && X().stage === 0 && performance.now() - t0 < 840000) {
      const x = X();
      const rider = W.dbgD.riderOf(x) === me();
      const roleKey = x.ride + (rider ? 'R' : 'O');
      if (roleKey !== lastRole) {
        lastRole = roleKey;
        B.note('reelle', 'tour ' + (x.ride + 1) + ' : ' + (rider ? 'dans le chariot' : 'au pupitre'));
      }
      if (rider) {
        steer(0, 0);
        if (!W.onCar(pos())) {
          // board only at the quay, the carriage docked
          await toQuay();
          if (!docked()) {
            await B.sl(150);
            continue;
          }
          await B.walk([0, 0, W.CAR.z0], 0.3, 6000);
          B.stop();
          await B.sl(300);
          if (W.onCar(pos())) B.note('reelle', 'monté·e dans le chariot');
          continue;
        }
        // in reach of a medallion (seen on my screen): E
        const T3 = W.dbgD.tokens() || [];
        const p = pos();
        const i = T3.findIndex((tk, k) => !(x.got & (1 << k)) && Math.hypot(p.x - W.P(0, tk.y, tk.z).x, p.y + 1.2 - W.P(0, tk.y, tk.z).y, p.z - W.P(0, tk.y, tk.z).z) < 1.8);
        if (i >= 0 && !L.home) {
          const g = x.got;
          await B.tap('interact');
          await B.until(() => X().got !== g || X().ride !== x.ride || X().stage !== 0, 1500, 50);
          if (X().got !== g || X().ride !== x.ride || X().stage !== 0) {
            grabs++;
            B.note('reelle', 'médaillon ' + i + ' attrapé (E)');
          }
          continue;
        }
        await B.sl(80);
        continue;
      }
      // ----- the operator -----
      if (!W.atConsole(pos())) {
        steer(0, 0);
        await toConsole();
        continue;
      }
      if (!L.driving) {
        B.face([W.CONSOLE.x, 1, W.CONSOLE.z]);
        await B.tap('interact');
        await B.sl(250);
        if (L.driving) B.note('reelle', 'manivelles prises (E)');
        continue;
      }
      if (!W.onCar(Remote.pos) || L.home) {
        steer(0, 0);
        await B.sl(200);
        continue;
      }
      if (!noted[x.ride + '|' + x.roll]) {
        noted[x.ride + '|' + x.roll] = 1;
        B.note('raccourci', 'médaillons visibles seulement du chariot (le partenaire guide à la voix) : le pupitre lit leurs positions (W.dbgD.tokens)');
      }
      const T3 = W.dbgD.tokens() || [];
      const i = [0, 1, 2].find((k) => T3[k] && !(x.got & (1 << k)));
      if (i == null) {
        await B.sl(200);
        continue;
      }
      const tk = T3[i];
      const p = path(W.ST.car, (z, y) => Math.abs(z - tk.z) <= 0.6 && Math.abs(y + 1.2 - tk.y) <= 0.5);
      if (!p) {
        B.note('reelle', 'pas de chemin vers le médaillon ' + i + ' ' + JSON.stringify(tk));
        await B.sl(500);
        continue;
      }
      // keep the corners of the path only
      const way = p.filter((q, k) => k === p.length - 1 || k === 0 || (p[k - 1][0] !== p[k + 1][0] && p[k - 1][1] !== p[k + 1][1]));
      let ok = true;
      for (const q of way) {
        if (!(await driveTo(q[0], q[1]))) {
          ok = false;
          break;
        }
      }
      if (ok) {
        const g = x.got;
        await B.until(() => X().got !== g || X().ride !== x.ride || X().roll !== x.roll || X().stage !== 0, 5000, 100);
      }
    }
    steer(0, 0);
    if (!live()) return me() + ': interrompu ' + JSON.stringify(X());
    B.note('reelle', 'six médaillons, ' + grabs + ' pris par moi');
    // the end: the carriage comes back to the quay; step off, both to the card (rel 0, 50)
    if (L.driving) await B.tap('interact');
    if (W.onCar(pos())) {
      await B.until(() => docked(), 60000, 100);
      await B.walk([0, 0, 54.2], 0.4, 8000);
    } else if (W.rel(pos()).x < -8.5) await B.walk([-11.5, 0, 54], 0.5, 20000, true);
    await B.walk([me() === 'dame' ? -0.8 : 0.8, 0, 50], 0.4, 20000);
    B.note('reelle', 'devant la carte ' + JSON.stringify(B.rel()));
    await B.until(() => !live(), 60000, 200);
    return me() + ': ' + grabs + ' médaillons, phase ' + (Story.S && Story.S.phase);
  },
};
