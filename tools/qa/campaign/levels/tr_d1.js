// tr_d1 « Les Interrupteurs » — solver (both pages; plays this page's kit, Story.role).
// Room 1: crossed Lights-Out (my tiles flip the partner's board; the partner reads it out).
// Room 2: the Dame grapples to the gallery and reads the engraved code; the Valet double-jumps to
// the ledges, carries each crystal (E) to its pedestal (E). Room 3: both on their platforms, the
// Valet reads the clock sequence aloud, each pulls their own levers (E); the Dame moves between
// her platforms by grapple, the Valet by running across the floor when the Guardian's light is
// turned away. Then both walk to the card.
window.CL = {
  timeout: 900,
  async run() {
    const W = (B.W = D1);
    const S = Input.sim;
    const role = Story.role;
    const dame = role === 'dame';
    const sd = dame ? -1 : 1;
    const X = () => Story.S.x;
    const live = () => !CL.abort && Story.S.phase === 'tr_d1';
    const q = () => W.rel(Player.body.p);
    const log = [];
    const say = (how, t) => {
      B.note(how, t);
      log.push(t);
    };

    // ---------------- room 1 ----------------
    const nb = (i) => {
      const r = (i / 3) | 0, c = i % 3, o = [i];
      if (r > 0) o.push(i - 3);
      if (r < 2) o.push(i + 3);
      if (c > 0) o.push(i - 1);
      if (c < 2) o.push(i + 1);
      return o;
    };
    const solve = (g) => {
      for (let m = 0; m < 512; m++) {
        const t = g.slice();
        for (let i = 0; i < 9; i++) if ((m >> i) & 1) nb(i).forEach((k) => (t[k] ^= 1));
        if (t.every(Boolean)) return m;
      }
      return -1;
    };
    if (X().stage === 1) {
      const mySide = dame ? 'L' : 'R';
      const target = dame ? 'R' : 'L';
      await B.walk([sd * 7, 0, 8], 0.6, 8000);
      await B.walk([sd * 7, 0, 14], 0.6, 6000);
      say('reelle', 'salle 1 : entrée par la porte ' + (dame ? '♥' : '♠'));
      for (let it = 0; it < 4 && live() && X().stage === 1; it++) {
        const g = X().grid[target];
        if (g.every(Boolean)) break;
        // the partner reads their board aloud (it is lit by MY tiles)
        const m = solve(g);
        if (m < 0) break;
        const list = [...Array(9).keys()].filter((i) => (m >> i) & 1);
        say('reelle', 'tableau de ' + target + ' lu par le partenaire : ' + g.join('') + ' → dalles ' + list.map((i) => i + 1).join(','));
        for (const i of list) {
          if (!live() || X().stage !== 1) break;
          const tl = W.tiles.find((t) => t.side === mySide && t.i === i);
          await B.walk([tl.x, 0, tl.z], 0.3, 6000);
          const before = X().grid[target].join('');
          await B.sl(120);
          await B.tap('interact');
          await B.until(() => X().grid[target].join('') !== before || X().stage !== 1, 1500, 50);
        }
        await B.sl(400);
      }
      await B.until(() => !live() || X().stage >= 2, 60000);
      say('reelle', 'salle 1 : les deux tableaux allumés');
    }

    // ---------------- room 2 ----------------
    const toRoom2 = async () => {
      if (q().z < 38) {
        await B.walk([sd * 7, 0, 36], 0.6, 8000);
        await B.walk([sd * 7, 0, 41], 0.6, 6000);
      }
    };
    if (live() && X().stage === 2) {
      await B.sl(800);
      await toRoom2();
      if (dame) {
        let up = false;
        for (let k = 0; k < 5 && live() && X().stage === 2 && !up; k++) {
          await B.walk([0, 0, 62], 0.5, 10000);
          B.aim(W.rings.r2.pos);
          await B.sl(250);
          if (Player.lockTarget < 0) {
            B.aim(W.rings.r2.pos.clone().add(V3(0, 1, 0)));
            await B.sl(250);
          }
          await B.tap('ability');
          up = await B.until(() => q().y > 6.5 && Player.body.grounded, 5000);
        }
        say('reelle', up ? 'grappin sur l’anneau : sur la galerie, lit le code gravé' : 'grappin vers la galerie : échec');
        B.aim(W.P(0, 0, 60));
        await B.until(() => !live() || X().stage !== 2, 240000);
      } else {
        const dameUp = await B.until(() => W.rel(Remote.pos).y > 6, 60000);
        if (!dameUp) B.note('raccourci', 'la Dame n’est pas sur la galerie après 60 s : le Valet lit le code sans elle');
        say('reelle', 'code dicté par la Dame : ' + JSON.stringify(X().code));
        let tries = 0;
        while (live() && X().stage === 2 && tries < 30) {
          tries++;
          const x = X();
          const k = ['h', 'c', 's'].find((kk) => x.crys[x.code[kk]] !== 'p' + kk);
          if (!k) {
            await B.sl(300);
            continue;
          }
          const col = x.code[k];
          const where = x.crys[col] || 'l' + W.crystals[col].ledge;
          if (where !== 'carried') {
            if (where[0] === 'p') {
              // on a wrong pedestal: take it back
              const pk = where.slice(1);
              await B.go([W.pedestals[pk].x, 0, 46.3], { near: 0.5, ms: 20000 });
              await B.tap('interact');
            } else {
              const l = W.ledges[+where.slice(1)];
              const ax = l.x > 0 ? l.x - 3.2 : l.x + 3.2;
              await B.go([ax, 0, l.z], { near: 0.5, ms: 25000 });
              let on = false;
              for (let j = 0; j < 4 && !on; j++) {
                await B.walk([ax, 0, l.z], 0.4, 3000);
                B.face([l.x, 3, l.z]);
                await B.leap([l.x, 2.95, l.z], { ms: 2500 });
                on = Math.abs(q().y - 2.95) < 0.5;
              }
              if (!on) {
                say('reelle', 'corniche ' + l.i + ' : double saut raté 4 fois');
                continue;
              }
              await B.sl(150);
              await B.tap('interact');
            }
            const got = await B.until(() => X().carrier === 'valet', 2000);
            if (!got) continue;
            say('reelle', 'cristal ' + col + ' pris');
            // off the ledge, back to the floor
            if (q().y > 1.5) await B.walk([q().x > 0 ? q().x - 3 : q().x + 3, 0, q().z], 0.5, 3000);
            await B.until(() => Player.body.grounded && q().y < 0.5, 3000);
          }
          const pd = W.pedestals[k];
          await B.go([pd.x, 0, 46.3], { near: 0.5, ms: 25000 });
          await B.walk([pd.x, 0, 46.3], 0.35, 3000);
          await B.tap('interact');
          await B.until(() => X().carrier !== 'valet', 2000);
          say('reelle', 'cristal ' + col + ' posé sur ' + W.SYM[k]);
          await B.sl(400);
        }
        await B.until(() => !live() || X().stage !== 2, 15000);
      }
    }

    // ---------------- room 3 ----------------
    if (live() && X().stage === 3) {
      await B.sl(1200);
      // the Guardian's light as this screen draws it: the fan of light on the floor (the only
      // ShapeGeometry of the workshop), its heading read from its world transform
      let fan = null;
      W.group.traverse((o) => {
        if (!fan && o.isMesh && o.geometry && o.geometry.type === 'ShapeGeometry') fan = o;
      });
      const gq = new THREE.Quaternion();
      const beamAng = () => {
        if (!fan) return 0;
        fan.updateWorldMatrix(true, false);
        const o = fan.getWorldPosition(V3());
        const d = V3(0, 0, 1).applyQuaternion(fan.getWorldQuaternion(gq));
        const a = W.rel(o);
        const b = W.rel(o.add(d));
        return Math.atan2(b.x - a.x, b.z - a.z);
      };
      if (!dame) B.note('reelle', 'le Valet regarde le faisceau du Gardien au sol' + (fan ? '' : ' (faisceau introuvable ?)'));
      try {
        const mine = dame ? ['h', 'd'] : ['s', 'c'];
        const sw = (k) => W.switches[k];
        const onPlat = (k) => {
          const s = sw(k), p = q();
          return Math.hypot(p.x - s.x, p.z - s.z) < 2.4 && Math.abs(p.y - s.h) < 0.5;
        };
        const curPlat = () => mine.find(onPlat);
        const running = () => X().r3 === 'run';
        const safe = () => {
          const a = ((beamAng() % (2 * Math.PI)) + 2 * Math.PI) % (2 * Math.PI);
          return a > 2.5 && a < 3.5;
        };
        const grappleTo = async (k) => {
          const ring = W.rings['r3' + k];
          for (let j = 0; j < 4 && live(); j++) {
            B.aim(ring.pos);
            await B.sl(200);
            await B.tap('ability');
            if (await B.until(() => onPlat(k) && Player.body.grounded, 5000)) return true;
            if (q().y < 1 && !Player.body.grounded) await B.until(() => Player.body.grounded, 2000);
          }
          return false;
        };
        const jumpTo = async (k) => {
          const s = sw(k);
          const cur = curPlat();
          const p = q();
          const dir = Math.sign(s.z - p.z) || 1;
          if (cur) {
            // across the floor: wait for the light to be turned away
            if (running()) await B.until(() => !running() || safe(), 15000, 20);
            await B.walk([s.x, 0, s.z - dir * 4.3], 0.6, 6000, true);
          } else {
            await B.walk([s.x - 1, 0, s.z - dir * 4.3], 0.6, 15000, true);
          }
          for (let j = 0; j < 3; j++) {
            await B.leap([s.x - 0.5, s.h, s.z - dir * 1.0], { ms: 2500 });
            if (onPlat(k)) return true;
            await B.walk([s.x, 0, s.z - dir * 4.3], 0.6, 3000, true);
          }
          return onPlat(k);
        };
        const moveTo = (k) => (dame ? grappleTo(k) : jumpTo(k));
        // first, onto a platform
        if (!curPlat()) {
          await moveTo(mine[0]);
          say('reelle', 'salle 3 : sur la plateforme ' + W.SYM[curPlat() || '?']);
        }
        say('reelle', dame ? 'ordre dicté par le Valet (il lit l’horloge)' : 'lit l’ordre sur l’horloge');
        let runId = 0, prevR3 = '', done = '', pulls = 0, fails = 0;
        const t0 = performance.now();
        while (live() && X().stage === 3 && performance.now() - t0 < 600000) {
          const x = X();
          if (x.r3 === 'run' && prevR3 !== 'run') runId++;
          if (x.r3 === 'fail' && prevR3 !== 'fail') fails++;
          prevR3 = x.r3;
          if (x.r3 === 'run') {
            const k = x.seq[x.prog];
            if (mine.includes(k)) {
              if (onPlat(k)) {
                const key = runId + ':' + x.round + ':' + x.prog;
                if (done !== key) {
                  done = key;
                  await B.tap('interact');
                  pulls++;
                  await B.until(() => X().prog !== x.prog || X().r3 !== 'run' || X().round !== x.round, 1500, 40);
                }
              } else await moveTo(k);
            } else {
              const nk = x.seq.slice(x.prog).find((s) => mine.includes(s));
              if (nk && !onPlat(nk)) await moveTo(nk);
            }
          } else if (!curPlat()) await moveTo(mine[0]);
          await B.sl(50);
        }
        say('reelle', 'horloge : ' + pulls + ' leviers, ' + fails + ' échecs, étape ' + X().stage);
      } finally {
        S.held.delete('interact');
      }
    }

    // ---------------- the card ----------------
    if (live() && X().stage >= 4) {
      if (q().y > 1.5) await B.walk([sd * 8, 0, q().z], 0.6, 4000);
      await B.until(() => Player.body.grounded, 3000);
      await B.go([sd * 1, 0, 104], { near: 0.6, ms: 30000 });
      await B.walk([sd * 1, 0, 104], 0.5, 4000);
      say('reelle', 'devant la carte');
      await B.until(() => Story.S.phase !== 'tr_d1' || CL.abort, 60000);
    }
    B.stop();
    return role + ': ' + log.slice(-3).join(' | ') + ' → ' + Story.S.phase;
  },
};
