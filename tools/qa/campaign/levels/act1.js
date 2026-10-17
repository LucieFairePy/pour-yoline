// ♥ La Balance (act1) — solver. Base kits.
//  1 the glass bridges: each one hops its own lane row by row onto the real glass, which only
//    the PARTNER sees (the partner calls it): read here from this page's own glass colliders
//  2 the winch: valet hooks onto the harness (E), dame holds the winch (E held) until across
//  3 the rings: valet holds the crank (E held, rings lit), dame grapples ring 1 then ring 2 (F)
//  4 the cabins: both step in and wait the 20 s out without pressing the button, then the card
window.CL = {
  timeout: 600,
  async run() {
    const PH = 'act1';
    const W = Arena;
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
    const COLS = { valet: [6, 4, 2], dame: [-2, -4, -6] };
    const mine = COLS[Story.role];
    const rowZ = (r) => 13.5 + r * 3;
    // the real glass of row i in my lane (my page only has a collider under the real one;
    // the partner's screen shows which it is and they call it out)
    const realX = (i) => mine.find((cx) => Phys.groundAt(W.O.x + cx, W.O.y + 0.5, W.O.z + rowZ(i)) > W.O.y - 0.1);

    const cross = async () => {
      await B.walk([mine[1], 0, 10.5], 0.4, 10000);
      for (let i = 0; i < 10; i++) {
        if (!live()) return 'interrompu';
        const cx = realX(i);
        if (cx == null) return 'rangée ' + i + ' : pas de verre trouvé';
        const r = await B.leap([cx, 0, rowZ(i)], { ms: 1800, dj: false });
        if (r[1] < -0.5) return 'tombé·e rangée ' + i;
      }
      await B.leap([mine[1], 0, 44], { ms: 1800, dj: false });
      await B.walk([dame ? -3 : 3, 0, 46], 0.5, 6000);
      return 'traversé ' + JSON.stringify(B.rel());
    };

    const st1 = async () => {
      B.note('reelle', 'pont de verre : sauts rangée par rangée sur la vraie dalle annoncée par le partenaire (il la voit, pas moi)');
      let r = '';
      for (let k = 0; k < 4 && live(); k++) {
        r = await cross();
        if (!/^tomb/.test(r)) break;
        B.note('reelle', r + ' : le pont est redistribué, on recommence');
        await wait(() => Player.body.grounded && B.rel()[1] > -0.5 && B.rel()[2] < 12, 10000);
        await B.sl(1000);
      }
      B.note('reelle', r);
      return (await wait(() => x().stage >= 2, 30000)) ? 'st1 ok' : 'st1 attente ' + r;
    };

    const st2 = async () => {
      if (dame) {
        await B.walk([-5, 0, 48.3], 0.4, 8000);
        S.held.add('interact');
        const r = await wait(() => x().stage >= 3, 60000);
        S.held.delete('interact');
        B.note('reelle', 'treuil tenu (E maintenu) ' + (r ? 'jusqu’à l’autre bord' : 'sans fin'));
        return r ? 'st2 ok' : 'st2 attente h' + x().h.t;
      }
      await B.walk([4, 0, 50.3], 0.4, 8000);
      for (let i = 0; i < 5 && live() && !x().att && x().stage === 2; i++) {
        await B.tap('interact');
        await wait(() => x().att, 1000);
      }
      if (x().att) B.note('reelle', 'accroché au harnais (E)');
      return (await wait(() => x().stage >= 3, 60000)) ? 'st2 ok' : 'st2 attente (harnais ' + x().att + ')';
    };

    const grab = async (ring) => {
      for (let i = 0; i < 60 && live(); i++) {
        B.aim(ring);
        await B.sl(100);
        if (Player.lockTarget >= 0) {
          await B.tap('ability');
          return true;
        }
      }
      return false;
    };
    const st3 = async () => {
      await B.sl(1000);
      if (!dame) {
        await B.walk([7.5, 0, 84.8], 0.4, 10000);
        S.held.add('interact');
        const r = await wait(() => x().stage >= 4, 60000);
        S.held.delete('interact');
        B.note('reelle', 'manivelle des anneaux tenue (E maintenu)');
        return r ? 'st3 ok' : 'st3 attente';
      }
      await B.walk([0, 0, 50.5], 0.5, 8000);
      if (!(await wait(() => x().lit, 20000))) return 'anneaux éteints';
      if (!(await grab(W.rings[0].pos))) return 'anneau 1 non verrouillé';
      await wait(() => Player.mode === 'walk', 5000);
      if (!(await grab(W.rings[1].pos))) return 'anneau 2 non verrouillé ' + B.rel();
      await wait(() => Player.mode === 'walk' && Player.body.grounded, 6000);
      B.note('reelle', 'grappin anneau 1 puis anneau 2 ' + JSON.stringify(B.rel()));
      await B.walk([-3, 0, 87], 0.6, 6000);
      return (await wait(() => x().stage >= 4, 10000)) ? 'st3 ok' : 'st3 attente ' + B.rel();
    };

    const st4 = async () => {
      await B.sl(1000);
      if (x().cab.phase !== 'win') {
        await B.walk([dame ? -4 : 4, 0, 92], 0.4, 10000);
        await B.walk([dame ? -4 : 4, 0, 96.3], 0.3, 6000);
        B.note('reelle', 'dans ma cabine : on attend ensemble sans appuyer sur le bouton');
        if (!(await wait(() => x().cab.phase === 'win', 60000))) return 'cabines : ' + x().cab.phase + ' ' + B.rel();
        B.note('reelle', 'les 20 s tenues ensemble : cabines ouvertes');
        await B.sl(1500);
      }
      await B.walk([dame ? -4 : 4, 0, 92], 0.5, 6000);
      await B.walk([dame ? -1 : 1, 0, 90], 0.5, 6000);
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
