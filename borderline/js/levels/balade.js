(() => {
  const T = CONFIG;
  const A = T.balade;
  const local = {
    stage: 0,
    line: null,
    signs: new Set(),
    carry: null,
    carryR: null,
    rel: false,
    benchAdded: false,
    bridgeHint: false,
  };
  const tm = { win: 0, sit: 0, far: 0 };

  const handLine = () => {
    const l = new THREE.Mesh(
      new THREE.CylinderGeometry(0.03, 0.03, 1, 6).translate(0, 0.5, 0).rotateX(Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ffcf8a').multiplyScalar(2),
        toneMapped: false,
      }),
    );
    l.visible = false;
    R.scene.add(l);
    return l;
  };

  const objective = (c) => {
    const st = c.S.x.stage;
    if (st === 1) return A.objective;
    if (st === 2) return A.lanterns;
    if (st === 3) return A.release;
    if (st === 4) return A.sit;
    if (st === 5) return A.cardLine;
    return '';
  };

  const stageEnter = (c, st) => {
    local.stage = st;
    HUD.objective(objective(c));
    if (st === 2) Sound.play('reveal');
    if (st === 3) Sound.play('chime');
    if (st === 4) {
      HUD.say(A.released, T.master, 3600);
      Sound.play('lantern');
    }
    if (st === 5) {
      Sound.play('card');
      HUD.say(A.cardLine, T.master, 2600);
    }
  };

  Story.register('balade', {
    init: () => ({ stage: 1, hand: false, req: {}, lan: {}, rel: {}, released: false }),
    voice: () => 1,
    async enter(c, first) {
      if (!first) await fadeTo(true);
      Balade.build();
      if (!local.benchAdded) {
        local.benchAdded = true;
        Balade.benches.forEach((b) => City.benches.push(b));
      }
      local.stage = 0;
      c.spawn(Balade.spawn(c.S.x.stage, c.role), 0);
      Player.killY = Balade.O.y - 3;
      // falling off the light bridge brings you back to its east end, not the start
      Player.checkpoint = () =>
        Story.S.x.stage === 1 && Balade.rel(Player.body.p).z > 40
          ? Balade.P(c.role === 'dame' ? 7.2 : 8.8, 0, 53)
          : Balade.spawn(Story.S.x.stage, c.role);
      Player.targets = null;
      City.mood({ gold: 0.25 });
      c.fog(0.011);
      Sound.mood('gold');
      HUD.visa(A.card + ' · ' + A.title);
      if (!local.line) local.line = handLine();
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      HUD.say(A.intro, T.master, 3400);
      HUD.say(A.signHint, T.master, 3200);
      HUD.say(A.gestures, T.master, 3800);
      this.apply(c);
    },
    exit() {
      if (local.line) local.line.visible = false;
      [local.carry, local.carryR].forEach((l) => l && R.scene.remove(l));
      local.carry = local.carryR = null;
      Player.handPose = false;
      Remote.handPose = false;
    },
    apply(c) {
      if (!Balade.built) return;
      const x = c.S.x;
      if (x.stage !== local.stage) stageEnter(c, x.stage);
    },
    host(c, dt) {
      if (!Balade.built) return;
      const x = c.S.x;
      const pd = c.pos('dame');
      const pv = c.pos('valet');
      const qd = Balade.rel(pd);
      const qv = Balade.rel(pv);
      // the partner is drawn a little in the past (network): only let go of the hand when
      // they are clearly apart for a moment, never because of lag while walking together
      const apart = Math.hypot(pd.x - pv.x, pd.z - pv.z) > 6.5;
      tm.far = x.hand && apart ? tm.far + dt : 0;
      if (tm.far > 0.8) {
        tm.far = 0;
        c.set((s) => (s.x.hand = false));
      }
      if (x.stage === 1 && Balade.passed(qd) && Balade.passed(qv)) c.set((s) => (s.x.stage = 2));
      if (x.stage === 2 && x.lan.dame && x.lan.valet) c.set((s) => (s.x.stage = 3));
      if (x.stage === 4) {
        const sitD = c.role === 'dame' ? Player.mode === 'sit' : c.remoteState().mode === 'sit';
        const sitV = c.role === 'valet' ? Player.mode === 'sit' : c.remoteState().mode === 'sit';
        tm.sit = sitD && sitV && Balade.nearBench(qd) && Balade.nearBench(qv) ? tm.sit + dt : 0;
        if (tm.sit > 2.5) c.set((s) => (s.x.stage = 5));
      }
      if (x.stage === 5) {
        tm.win += dt;
        if (tm.win > 4 && Balade.nearCard(qd) && Balade.nearCard(qv))
          c.goto('reward', (s) => (s.x.card = 'h2'));
      }
    },
    action(c, who, d) {
      const x = c.S.x;
      const o = who === 'dame' ? 'valet' : 'dame';
      if (d.a === 'hand') {
        const now = performance.now();
        if (x.hand) return c.set((s) => (s.x.hand = false));
        x.req[who] = now;
        if (x.req[o] && now - x.req[o] < 2500) c.set((s) => (s.x.hand = true));
      }
      if (d.a === 'lan' && x.stage === 2 && !x.lan[who]) c.set((s) => (s.x.lan[who] = true));
      if (d.a === 'release' && x.stage === 3) {
        x.rel[who] = performance.now();
        if (x.rel[o] && performance.now() - x.rel[o] < 3000)
          c.set((s) => {
            s.x.released = true;
            s.x.stage = 4;
          });
      }
    },
    update(c, dt, t) {
      if (!Balade.built) return null;
      const x = c.S.x;
      const p = Player.body.p;
      const rp = Remote.pos;
      const q = Balade.rel(p);
      const close = Math.hypot(p.x - rp.x, p.z - rp.z) < 1.8;
      Balade.update(dt, t, x, !!x.hand);
      Player.handPose = x.hand && close;
      Remote.handPose = x.hand && close;
      const l = local.line;
      if (l) {
        l.visible = x.hand;
        if (x.hand) {
          const a = V3(p.x, p.y + 0.95, p.z);
          const b = V3(rp.x, rp.y + 0.95, rp.z);
          l.position.copy(a);
          l.lookAt(b);
          l.scale.set(1, 1, Math.max(0.01, a.distanceTo(b)));
        }
      }
      // carried lanterns float above each player's hand until released
      const carrying = (who) => x.lan[who] && !x.released;
      const mine = carrying(c.role);
      const theirs = carrying(c.other);
      if (mine && !local.carry) {
        local.carry = Balade.lantern();
        R.scene.add(local.carry);
      }
      if (theirs && !local.carryR) {
        local.carryR = Balade.lantern();
        R.scene.add(local.carryR);
      }
      if (local.carry) {
        if (x.released) local.carry.position.y += dt * 1.6;
        else local.carry.position.set(p.x, p.y + 2.3 + Math.sin(t * 2) * 0.08, p.z);
        if (local.carry.position.y > p.y + 60) {
          R.scene.remove(local.carry);
          local.carry = null;
        }
      }
      if (local.carryR) {
        if (x.released) local.carryR.position.y += dt * 1.6;
        else local.carryR.position.set(rp.x, rp.y + 2.3 + Math.sin(t * 2 + 1) * 0.08, rp.z);
        if (local.carryR.position.y > rp.y + 60) {
          R.scene.remove(local.carryR);
          local.carryR = null;
        }
      }
      // question signs
      Balade.signs.forEach((s, i) => {
        if (!local.signs.has(i) && Math.hypot(p.x - s.pos.x, p.z - s.pos.z) < 3.5) {
          local.signs.add(i);
          Sound.play('chime');
          HUD.say(s.txt.replace('Panneau · ', ''), 'Panneau', 5200);
        }
      });
      if (x.stage === 1 && Balade.nearBridge(q) && !x.hand && !local.bridgeHint) {
        local.bridgeHint = true;
        HUD.say(A.bridge, T.master, 4200);
      }
      const sit = Benches.update(c);
      if (Player.mode === 'sit') return sit;
      if (x.stage === 2 && !x.lan[c.role] && Balade.nearStall(q)) {
        if (Input.pressed('interact')) {
          c.act({ a: 'lan' });
          Sound.play('chime');
        }
        return ['E', 'Prendre une lanterne'];
      }
      if (x.stage === 3 && Balade.onPier(q)) {
        if (Input.pressed('interact')) {
          c.act({ a: 'release' });
          Sound.play('chime');
        }
        return ['E', 'Lâcher la lanterne (ensemble)'];
      }
      if (sit) return sit;
      if (close || x.hand) {
        if (Input.pressed('interact')) c.act({ a: 'hand' });
        return ['E', x.hand ? 'Lâcher sa main' : 'Lui tendre la main'];
      }
      return null;
    },
  });
})();
