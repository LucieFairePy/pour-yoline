// ♥ La Balade (balade) — solver. Base kits; both do the same thing side by side.
//  1 walk to the light bridge, take each other's hand (both E within 2.5 s), cross hand in hand
//  2 each takes a lantern at the stall (E)
//  3 on the pier, both let go of the lanterns together (E within 3 s)
//  4 sit on the bench together (E), then stand up (jump) and go to the card
window.CL = {
  timeout: 600,
  async run() {
    const PH = 'balade';
    const W = Balade;
    B.W = W;
    const S = Input.sim;
    const x = () => Story.S.x;
    const dame = Story.role === 'dame';
    const o = dame ? -0.6 : 0.6;
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
    const partnerNear = (r) => Math.hypot(Remote.pos.x - Player.body.p.x, Remote.pos.z - Player.body.p.z) < r;

    const st1 = async () => {
      await B.walk([8 + o, 0, 30], 0.6, 20000, true);
      await B.walk([7.5 + o, 0, 59.6 + o * 0.5], 0.3, 20000);
      // wait for the partner by my side, then reach for the hand (E); a tap while the hands
      // are joined lets go, so tap only while they are apart
      await wait(() => partnerNear(1.7), 30000);
      await B.sl(800);
      for (let i = 0; i < 10 && live() && !x().hand; i++) {
        await B.tap('interact');
        await wait(() => x().hand, dame ? 2000 : 2400);
      }
      if (!x().hand) return 'pas de main ' + JSON.stringify(B.rel());
      B.note('reelle', 'main dans la main (E chacun) devant le pont de lumière');
      await B.walk([-8 + o, 0, 59.6 + o * 0.5], 0.5, 15000);
      await B.walk([-8 + o, 0, 70], 0.5, 8000);
      B.note('reelle', 'pont traversé ensemble ' + JSON.stringify(B.rel()));
      return (await wait(() => x().stage >= 2, 10000)) ? 'st1 ok' : 'st1 attente ' + B.rel();
    };
    const st2 = async () => {
      // let go of the hand (the valet's E; the host also drops it once apart)
      if (x().hand && !dame) {
        await B.tap('interact');
        await B.sl(500);
      }
      await B.walk([-7.8, 0, 100], 0.8, 30000, true);
      await B.walk([-9 + o, 0, 106.5], 0.5, 30000, true);
      for (let i = 0; i < 6 && live() && !(x().lan || {})[Story.role]; i++) {
        await B.tap('interact');
        await B.sl(400);
      }
      if ((x().lan || {})[Story.role]) B.note('reelle', 'lanterne prise (E)');
      return (await wait(() => x().stage >= 3, 20000)) ? 'st2 ok' : 'st2 attente';
    };
    const st3 = async () => {
      await B.walk([-7.5, 0, 125 + o * 2], 0.5, 15000);
      await B.walk([-3.2, 0, 125 + o * 2], 0.4, 8000);
      await wait(() => W.onPier(W.rel(Remote.pos)), 15000);
      await B.sl(800);
      for (let i = 0; i < 8 && live() && x().stage === 3; i++) {
        await B.tap('interact');
        await B.sl(900);
      }
      if (x().stage >= 4) B.note('reelle', 'lanternes lâchées ensemble (E)');
      return x().stage >= 4 ? 'st3 ok' : 'st3 attente ' + B.rel();
    };
    const st4 = async () => {
      await B.walk([-8 + o * 2, 0, 196], 0.5, 40000, true);
      await B.walk([-9 + o * 1.5, 0, 199], 0.4, 6000);
      for (let i = 0; i < 6 && live() && Player.mode !== 'sit'; i++) {
        await B.tap('interact');
        await B.sl(500);
      }
      if (Player.mode === 'sit') B.note('reelle', 'assis·e sur le banc (E)');
      if (!(await wait(() => x().stage >= 5, 20000))) return 'banc : ' + Player.mode + ' ' + B.rel();
      return 'st4 ok';
    };
    const st5 = async () => {
      await B.sl(4500);
      if (Player.mode === 'sit') {
        await B.tap('jump');
        await B.sl(500);
      }
      await B.walk([-3 + o, 0, 204], 0.6, 8000);
      B.note('reelle', 'levé·e (Espace), à la carte');
      await wait(() => false, 12000);
      return live() ? 'pas fini ' + B.rel() : 'won';
    };

    const ST = { 1: st1, 2: st2, 3: st3, 4: st4, 5: st5 };
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
