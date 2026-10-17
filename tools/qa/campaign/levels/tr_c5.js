// ♣ 6 · La Bombe à cœurs II (tr_c5). No swap: Yoline = dame, William = valet.
// Stage 1: the dame walks through the van door (it seals behind her) to the bomb; the valet opens
//   the manual at the lectern of car A (E, a page turn, Espace). The dame examines each module (E in
//   front of its slot) and works it with the arrows / E, as the reader's manual says (C5.RULES =
//   the manual's rules, applied to what she describes from her screen).
// Stage 2: the bomb rolls to the locomotive; the valet follows it (the loco door seals), the dame
//   reads the second manual in the machines car and purges the valves (hold E) before the red.
//   The valet works the three flipped modules the same way.
// Stage 3: both at their key, E together on the beat = sum of the two digits (each one's digit is
//   on its own screen, said aloud), three rounds.
// Stage 4: both at the card in front of the bomb.
window.CL = {
  timeout: 900,
  async run() {
    const W = C5;
    B.W = W;
    const R5 = W.RULES;
    const me = Story.role;
    const X = () => Story.S.x;
    const ab = () => window.CL.abort;
    const S = Input.sim;
    const log = [];
    const rel = () => W.rel(Player.body.p);
    const dbg = () => W.dbg || {};
    const Lv = () => W.L || {};

    // one arrow push (the level reads the stick as arrows, on the frame it is pushed)
    const push = async (d) => {
      S.x = d === 'r' ? 1 : d === 'l' ? -1 : 0;
      S.z = d === 'u' ? 1 : d === 'd' ? -1 : 0;
      await B.sl(120);
      S.x = 0;
      S.z = 0;
      await B.sl(120);
    };
    const changed = async (f, i, before) => {
      await B.until(() => JSON.stringify(X().mods[f][i]) !== before || X().stage !== f + 1, 1500, 40);
    };
    // one module, from the face f, through the focus UI
    const solveModule = async (f, i) => {
      const z = W.BOMB_Z[f + 1] - 1.5;
      const sx = [0.75, 0, -0.75][i];
      for (let k = 0; k < 4 && dbg().focus !== i && !ab(); k++) {
        if (X().mods[f][i].solved) return true;
        await B.until(() => !Lv().moving, 15000, 100);
        if (Math.hypot(rel().x - sx, rel().z - z) > 0.3) {
          if (Math.abs(rel().z - z) > 3) await B.go([sx, 0, z], { near: 0.3, ms: 40000 });
          await B.walk([sx, 0, z], 0.15, 4000);
        }
        await B.sl(200);
        await B.tap('interact');
        await B.until(() => dbg().focus === i, 1500, 40);
      }
      if (dbg().focus !== i) {
        B.note('reelle', 'module ' + i + ' : examen (E) impossible depuis ' + B.rel());
        return false;
      }
      const m0 = X().mods[f][i];
      B.note('reelle', me + ' examine le module ' + i + ' (' + m0.k + '), le lecteur dicte la règle du manuel');
      for (let guard = 0; guard < 50 && !ab(); guard++) {
        const m = X().mods[f][i];
        if (!m || m.solved || X().stage !== f + 1 || dbg().focus !== i) break;
        const before = JSON.stringify(m);
        const sel = () => dbg().sel;
        if (m.k === 'wires') {
          const t = R5.wireAnswer(m.w, X().serial);
          for (let n = 0; n < 8 && sel() !== t; n++) await push(sel() < t ? 'd' : 'u');
          await B.tap('interact');
        } else if (m.k === 'keys') {
          const t = R5.keyOrder(m)[m.pressed.length];
          if ((sel() ^ t) & 1) await push('r');
          if ((sel() ^ t) & 2) await push('d');
          await B.tap('interact');
        } else if (m.k === 'simon') {
          const n = R5.simonWant(m, X().serial, X().strikes || 0)[m.input.length];
          await push(['u', 'r', 'd', 'l'][n]);
        } else if (m.k === 'memo') {
          const t = R5.memoWant(m);
          for (let n = 0; n < 6 && sel() !== t; n++) await push(sel() < t ? 'r' : 'l');
          await B.tap('interact');
        } else if (m.k === 'dial') {
          if (R5.dialOk(m)) await B.tap('interact');
          else await push('r');
        } else if (m.k === 'maze') {
          let best = -1;
          let bd = 1e9;
          for (let k = 0; k < 4; k++) {
            const n = R5.mazeStep(m.m, m.pos, k);
            if (n < 0) continue;
            const d = R5.mazeDist(m.m, n, m.goal);
            if (d >= 0 && d < bd) {
              bd = d;
              best = k;
            }
          }
          if (best < 0) break;
          await push(['u', 'r', 'd', 'l'][best]);
        }
        await changed(f, i, before);
      }
      const ok = !!(X().mods[f] && X().mods[f][i] && X().mods[f][i].solved);
      // a solved module lets go after ~1.2 s; Espace backs off otherwise
      await B.until(() => dbg().focus !== i, 2000, 50);
      if (dbg().focus === i) await B.tap('jump');
      await B.until(() => Player.mode !== 'frozen', 1500, 50);
      B.note('reelle', 'module ' + i + ' (' + m0.k + ') ' + (ok ? 'désamorcé' : 'pas désamorcé') + ', erreurs ' + (X().strikes || 0));
      return ok;
    };
    const solveFace = async (f) => {
      for (let pass = 0; pass < 4 && X().stage === f + 1 && !ab(); pass++)
        for (let i = 0; i < 3 && X().stage === f + 1 && !ab(); i++) if (!X().mods[f][i].solved) await solveModule(f, i);
    };
    // the reader opens the manual at the lectern, turns a page, closes it
    const readBook = async (k) => {
      const lz = k === 1 ? 15 : 52.5;
      await B.go([0, 0, lz - 0.9], { near: 0.35, ms: 40000 });
      await B.tap('interact');
      const open = await B.until(() => dbg().read, 1500, 40);
      if (open) {
        await B.sl(1500);
        await push('r');
        await B.sl(1200);
        await push('l');
        await B.sl(500);
        await B.tap('jump');
        await B.until(() => !dbg().read, 1500, 40);
      }
      B.note('reelle', me + ' lit le manuel ' + k + ' au lutrin (E, page, Espace) : ' + (open ? 'ouvert' : 'pas ouvert'));
    };

    // ================= stage 1 =================
    if (X().stage === 1) {
      if (me === 'dame') {
        await B.go([0, 0, 25.5], { near: 0.5, ms: 30000 });
        await B.go([0.75, 0, W.BOMB_Z[1] - 1.5], { near: 0.3, ms: 30000 });
        await B.until(() => X().seal1 || ab(), 30000, 100);
        B.note('reelle', 'dame à la bombe, porte du fourgon verrouillée (seal1=' + X().seal1 + ')');
        await solveFace(0);
      } else {
        await readBook(1);
        await B.until(() => X().stage !== 1 || ab(), 600000, 200);
      }
      log.push('face1 ' + (X().stage >= 2 ? 'ok' : 'ko'));
    }
    if (ab()) return log.join(', ');

    // ================= stage 2 =================
    if (X().stage === 2) {
      if (me === 'valet') {
        await B.until(() => !Lv().moving || ab(), 15000, 100);
        await B.sl(300);
        await B.go([0, 0, 64], { near: 0.6, ms: 60000 });
        await B.go([0.75, 0, W.BOMB_Z[2] - 1.5], { near: 0.3, ms: 30000 });
        await B.until(() => X().seal2 || ab(), 30000, 100);
        B.note('reelle', 'valet à la bombe dans la locomotive (seal2=' + X().seal2 + ')');
        await solveFace(1);
      } else {
        await readBook(2);
        // the valves: purge (hold E) any needle getting near the red
        const VAL = [
          [-1.7, 57.5],
          [1.7, 60.5],
          [-1.7, 63.5],
        ];
        let purges = 0;
        while (X().stage === 2 && !ab()) {
          const pr = Lv().press || [0, 0, 0];
          let v = -1;
          pr.forEach((p, k) => {
            if (p > 0.55 && (v < 0 || p > pr[v])) v = k;
          });
          if (v < 0) {
            await B.sl(250);
            continue;
          }
          await B.walk([VAL[v][0], 0, VAL[v][1]], 0.3, 6000);
          if (W.nearValve(rel()) === v) {
            await B.hold('interact', 1500);
            purges++;
            B.note('reelle', 'dame purge la vanne ' + (v + 1) + ' (E maintenu)');
          } else await B.sl(200);
        }
        log.push('purges ' + purges);
      }
      log.push('face2 ' + (X().stage >= 3 ? 'ok' : 'ko'));
    }
    if (ab()) return log.join(', ');

    // ================= stage 3: the keys =================
    if (X().stage === 3) {
      const K = me === 'dame' ? [-1.7, 0, 75.15] : [1.7, 0, 75.15];
      if (Math.abs(rel().z - K[2]) > 3) await B.go([K[0] * 0.5, 0, 73], { near: 0.6, ms: 40000 });
      await B.walk([K[0] * 0.45, 0, 74.6], 0.3, 4000); // around the key post (z 76.1)
      await B.walk(K, 0.2, 6000);
      B.note('reelle', me + ' à sa clé (nearKey=' + W.nearKey(rel(), me) + '), chiffres dits à voix haute');
      let turns = 0;
      while (X().stage === 3 && !ab() && turns < 40) {
        const fin = X().fin;
        const L = Lv();
        if (!fin || !L.beat) {
          await B.sl(30);
          continue;
        }
        const want = ((fin.dig.dame + fin.dig.valet - 1) % 4) + 1;
        if (L.beat === want && L.beatFrac > 0.15 && L.beatFrac < 0.45) {
          if (!W.nearKey(rel(), me)) await B.walk(K, 0.2, 2000);
          const r0 = fin.round;
          await B.tap('interact', 60);
          turns++;
          await B.until(() => !X().fin || X().fin.round !== r0 || X().stage !== 3, 1600, 30);
          await B.until(() => Lv().beat !== want, 1200, 20);
        }
        await B.sl(20);
      }
      log.push('clés ' + turns);
    }
    if (ab()) return log.join(', ');

    // ================= stage 4: the card =================
    await B.until(() => X().stage >= 4 || ab(), 30000, 200);
    const s = me === 'dame' ? -1 : 1;
    await B.walk([s * 0.45, 0, W.BOMB_Z[2] - 2.6], 0.2, 6000);
    B.note('reelle', me + ' à la carte');
    await B.until(() => Story.S.phase !== 'tr_c5' || ab(), 15000, 200);
    return me + ': ' + log.join(', ');
  },
};
