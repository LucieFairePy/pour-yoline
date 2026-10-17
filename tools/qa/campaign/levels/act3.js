// act3 « L’Heure dorée » (the city at golden hour): the three new memories (p3 p4 p5) are looked
// at with E, then both ride the lift up the tower together (the cabin leaves only with both on
// board the first time), walk out on the roof and sit on the bench: the moment, then act4.
window.CL = {
  timeout: 600,
  async run() {
    const dame = Story.role === 'dame';
    const x = () => Story.S.x;
    const log = [];
    // the memories: the dame takes p4 and p5, the valet p3 (either may look at any)
    for (const id of dame ? ['p4', 'p5'] : ['p3']) {
      if (CL.abort) return 'aborted';
      if (x().found.includes(id)) continue;
      const e = City.places[id].entry;
      const ok = await B.go(V3(e.x, 0, e.z), { near: 1.6, ms: 120000 });
      await B.sl(300);
      await B.tap('interact');
      const got = await B.until(() => x().found.includes(id), 5000);
      B.note('reelle', `souvenir ${id} : marche ${ok ? 'ok' : 'incomplète'}, E → ${got ? 'trouvé' : 'PAS trouvé'}`);
      log.push(id + (got ? '' : '?'));
      // the memory card is closed by the runner (Enter); wait for it
      await B.until(() => $('memory').hidden, 15000);
    }
    if (!(await B.until(() => x().found.length >= 3, 120000))) return 'spots ' + x().found.join(',');
    // into the cabin, both (the street doors are open while it is down)
    const L = City.LIFT || V3(City.TOWER.x, 0, City.TOWER.z + 10.2);
    await B.go(V3(L.x + (dame ? -0.9 : 0.9), 0, L.z + 4), { near: 0.8, ms: 120000 });
    await B.until(() => Story.S.x.lift.y < 0.2, 30000);
    await B.walk(V3(L.x + (dame ? -0.9 : 0.9), 0, L.z + 0.3), 0.4, 8000);
    B.note('reelle', 'dans la cabine de l’ascenseur ' + B.where().join(','));
    const up = await B.until(() => Player.body.p.y > City.TOWER.y - 0.5, 60000);
    if (!up) return log.join(',') + ' — lift did not go up (y ' + Player.body.p.y.toFixed(1) + ', lift ' + JSON.stringify(x().lift) + ')';
    B.note('reelle', 'en haut de la tour');
    await B.sl(1500);
    // out by the back doors, to the bench
    const b = City.roofBench;
    await B.walk(V3(L.x + (dame ? -0.9 : 0.9), City.TOWER.y, L.z - 3.5), 0.5, 8000);
    await B.go(V3(b.pos.x + (dame ? -0.5 : 0.5), City.TOWER.y, b.pos.z + 1.4), { near: 0.6, ms: 30000 });
    for (let i = 0; i < 6 && Player.mode !== 'sit'; i++) {
      await B.tap('interact');
      await B.sl(400);
    }
    B.note('reelle', Player.mode === 'sit' ? 'assis sur le banc du toit (E)' : 'PAS assis ' + B.where().join(','));
    const m = await B.until(() => Story.S.phase !== 'act3' || x().moment, 60000);
    return log.join(',') + (m ? ' — moment' : ' — no moment');
  },
};
