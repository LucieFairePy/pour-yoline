// ♠ 4 · Les Toits qui tombent (épreuve d'adresse, kits normaux).
// ---------- the Joker's drones (♠ 4): searchlights flying too high for the sword, so the rifle
// shoots them, and the Voile hides you from their beams; on the roof itself, the Joker's
// shield guards: the rifle glances off their shields, the sword breaks the guard ----------
(() => {
  const TILT = 0.95;
  const HALF = 0.3;
  const LEN = 17;
  Enemies.define('drone', {
    stats: { hp: 45, speed: 0, radius: 0.9, height: 0.4, hitR: 1.1, reach: 3.4, stunP: 3, dieColor: '#ff2a3a' },
    // out of reach up there: a sword blow (it carries a stun) does nothing, bullets do
    mult: (e, weak, stun) => (stun ? 0 : 1),
    // host: patrol back and forth along the roof, the beam sweeping left and right
    sim(e, dt) {
      e.t = (e.t || Math.random() * 6) + dt;
      if (e.stun > 0) {
        e.pos.y = damp(e.pos.y, e.home.y - 2.2, 3, dt);
        return;
      }
      const span = e.span || 8;
      e.pos.x = e.home.x + Math.sin(e.t * (e.spd || 0.45)) * span;
      e.pos.z = e.home.z + Math.sin(e.t * 0.31 + 1.3) * (e.spanZ || 4);
      e.pos.y = damp(e.pos.y, e.home.y + Math.sin(e.t * 1.7) * 0.35, 2, dt);
      e.yaw = (e.face || Math.PI) + Math.sin(e.t * (e.sweep || 0.9)) * 0.9;
    },
    model: () => {
      const g = new THREE.Group();
      const body = new THREE.Group();
      g.add(body);
      const shell = new THREE.MeshStandardMaterial({ color: '#3a3044', metalness: 0.35, roughness: 0.32, emissive: '#160a14' });
      const red = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff2a3a').multiplyScalar(2.2), toneMapped: false });
      const core = new THREE.Mesh(new THREE.SphereGeometry(0.55, 24, 16), shell);
      core.scale.set(1, 0.55, 1);
      body.add(core);
      const ring = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.05, 8, 40), new THREE.MeshStandardMaterial({ color: '#c9a24a', metalness: 1, roughness: 0.25 }));
      ring.rotation.x = Math.PI / 2;
      body.add(ring);
      const rotors = [];
      for (let i = 0; i < 4; i++) {
        const a = (i / 4) * Math.PI * 2 + Math.PI / 4;
        const arm = new THREE.Mesh(new THREE.BoxGeometry(1.1, 0.07, 0.12), shell);
        arm.position.set(Math.cos(a) * 0.75, 0.05, Math.sin(a) * 0.75);
        arm.rotation.y = -a;
        body.add(arm);
        const hub = new THREE.Group();
        hub.position.set(Math.cos(a) * 1.25, 0.14, Math.sin(a) * 1.25);
        const blade = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.015, 0.09), new THREE.MeshStandardMaterial({ color: '#16121a', metalness: 0.4, roughness: 0.5 }));
        const blade2 = blade.clone();
        blade2.rotation.y = Math.PI / 2;
        const disc = new THREE.Mesh(new THREE.CircleGeometry(0.45, 24).rotateX(-Math.PI / 2), new THREE.MeshBasicMaterial({ color: '#ff8a9a', transparent: true, opacity: 0.08, depthWrite: false }));
        hub.add(blade, blade2, disc);
        body.add(hub);
        rotors.push(hub);
        const tip = new THREE.Mesh(new THREE.SphereGeometry(0.05, 6, 6), red);
        tip.position.set(Math.cos(a) * 1.25, 0.02, Math.sin(a) * 1.25);
        body.add(tip);
      }
      // the Joker's mask on the front
      const maskTex = LvKit.tex(512, 256, (gg, w, h) => {
        gg.clearRect(0, 0, w, h);
        gg.fillStyle = '#ffd6e2';
        Icons.draw(gg, 'venetian-mask', w / 2, h / 2, 220);
      });
      const mask = new THREE.Mesh(new THREE.PlaneGeometry(0.6, 0.3), new THREE.MeshBasicMaterial({ map: maskTex, transparent: true, toneMapped: false }));
      mask.position.set(0, 0.12, 0.52);
      body.add(mask);
      // searchlight lens + beam
      const eye = new THREE.Mesh(new THREE.SphereGeometry(0.17, 14, 10), red);
      eye.position.set(0, -0.22, 0.4);
      body.add(eye);
      const beamPivot = new THREE.Group();
      beamPivot.position.copy(eye.position);
      beamPivot.rotation.x = Math.PI / 2 + TILT;
      const beam = new THREE.Mesh(
        new THREE.ConeGeometry(Math.tan(HALF) * LEN, LEN, 28, 1, true).translate(0, -LEN / 2, 0).rotateX(Math.PI),
        new THREE.MeshBasicMaterial({
          color: new THREE.Color('#ff4a5a').multiplyScalar(1.1),
          transparent: true,
          opacity: 0.12,
          blending: THREE.AdditiveBlending,
          depthWrite: false,
          side: THREE.DoubleSide,
          toneMapped: false,
        }),
      );
      beamPivot.add(beam);
      body.add(beamPivot);
      return {
        g,
        body,
        eye,
        beam,
        anim(e, dt, t) {
          rotors.forEach((r, i) => (r.rotation.y += dt * (40 + i)));
          beam.visible = !(e.stun > 0);
          beam.material.opacity = 0.1 + 0.04 * Math.sin(t * 9 + e.id);
          body.rotation.z = Math.sin(t * 1.3 + e.id) * 0.06;
          body.rotation.x = e.stun > 0 ? 0.5 : 0.05;
        },
      };
    },
  });
  // the roof guards: a squat armoured figure behind a big round shield
  const GM = {};
  Enemies.define('gardeToit', {
    stats: { hp: 40, speed: 3, radius: 0.7, hitR: 0.95, height: 2, reach: 3.2, stunP: 2.6, dieColor: '#ff5f8a' },
    // the shield turns bullets; a sword blow breaks the guard (stun), then everything hurts
    mult(e, weak, stun) {
      if (e.fall) return 1;
      if (stun) return 1;
      return e.stun > 0 ? 1.2 : 0;
    },
    sim(e, dt, players, targets) {
      // its strip fell: it falls too
      const gy = Phys.groundAt(e.pos.x, e.pos.y + 0.6, e.pos.z);
      if (e.fall || gy < e.pos.y - 0.4) {
        e.fall = true;
        e.vy = (e.vy || 0) - 26 * dt;
        e.pos.y += e.vy * dt;
        if (e.pos.y < e.home.y - 12) Enemies.damage(e.id, 999, 0, false);
        return;
      }
      e.shield = true;
      if (e.stun > 0) return;
      let best = null;
      let bd = 9;
      targets.forEach((p) => {
        const d = Math.hypot(p.pos.x - e.pos.x, p.pos.z - e.pos.z);
        if (d < bd && Math.abs(p.pos.y - e.pos.y) < 2) {
          bd = d;
          best = p;
        }
      });
      const goal = best ? best.pos : e.home;
      const dx = goal.x - e.pos.x;
      const dz = goal.z - e.pos.z;
      const d = Math.hypot(dx, dz);
      if (best) e.yaw = Math.atan2(dx, dz);
      if (d > (best ? 1.4 : 0.3)) {
        const sp = (best ? 3 : 1.6) * dt;
        const nx = e.pos.x + (dx / d) * sp;
        const nz = e.pos.z + (dz / d) * sp;
        // never steps off its roof, nor wanders far from its post
        const ng = Phys.groundAt(nx, e.pos.y + 0.6, nz);
        if (ng > e.pos.y - 0.4 && Math.hypot(nx - e.home.x, nz - e.home.z) < 7) {
          e.pos.x = nx;
          e.pos.z = nz;
          if (!best) e.yaw = Math.atan2(dx, dz);
        }
      } else if (best && e.atk <= 0) {
        e.atk = 1.25;
        Combat.hurt(best.who, 12, e.pos);
      }
    },
    model: () => {
      if (!GM.armor) {
        GM.armor = new THREE.MeshStandardMaterial({ color: '#2c2236', metalness: 0.45, roughness: 0.38, emissive: '#12070f' });
        GM.trim = new THREE.MeshStandardMaterial({ color: '#c9a24a', metalness: 0.8, roughness: 0.3 });
        GM.shield = new THREE.MeshStandardMaterial({ color: '#3a1830', metalness: 0.6, roughness: 0.25, emissive: '#ff2a5a', emissiveIntensity: 0.08 });
        GM.rim = new THREE.MeshBasicMaterial({ color: new THREE.Color('#ff5f8a').multiplyScalar(2), toneMapped: false });
      }
      const g = new THREE.Group();
      const body = new THREE.Group();
      g.add(body);
      const add = (geo, mat, x, y, z) => {
        const m = new THREE.Mesh(geo, mat);
        m.position.set(x, y, z);
        body.add(m);
        return m;
      };
      add(new THREE.CylinderGeometry(0.42, 0.5, 0.9, 16), GM.armor, 0, 0.45, 0);
      add(new THREE.CylinderGeometry(0.55, 0.42, 0.8, 16), GM.armor, 0, 1.25, 0);
      add(new THREE.TorusGeometry(0.5, 0.05, 8, 24).rotateX(Math.PI / 2), GM.trim, 0, 0.95, 0);
      add(new THREE.SphereGeometry(0.62, 16, 10, 0, Math.PI * 2, 0, Math.PI / 2), GM.armor, 0, 1.62, 0).scale.set(1, 0.45, 1);
      add(new THREE.SphereGeometry(0.3, 16, 12), GM.armor, 0, 1.95, 0);
      const maskTex = LvKit.tex(256, 128, (gg, w, h) => {
        gg.clearRect(0, 0, w, h);
        gg.fillStyle = '#ffd6e2';
        Icons.draw(gg, 'venetian-mask', w / 2, h / 2, 110);
      });
      add(new THREE.PlaneGeometry(0.42, 0.21), new THREE.MeshBasicMaterial({ map: maskTex, transparent: true, toneMapped: false }), 0, 1.98, 0.29);
      const eye = add(new THREE.SphereGeometry(0.05, 8, 6), new THREE.MeshBasicMaterial({ color: '#ff2a3a', toneMapped: false }), 0, 1.86, 0.3);
      // the shield: held in front, it drops aside while the guard is stunned
      const shield = new THREE.Group();
      shield.position.set(0, 1.15, 0.62);
      const disc = new THREE.Mesh(new THREE.CylinderGeometry(0.62, 0.62, 0.08, 32).rotateX(Math.PI / 2), GM.shield);
      const rim = new THREE.Mesh(new THREE.TorusGeometry(0.62, 0.04, 8, 40), GM.rim);
      shield.add(disc, rim);
      body.add(shield);
      return {
        g,
        body,
        eye,
        shield,
        anim(e, dt, t) {
          body.position.y = e.stun > 0 ? 0 : Math.abs(Math.sin(t * 6 + e.id)) * 0.05;
          body.rotation.x = e.stun > 0 ? 0.25 : 0;
        },
      };
    },
  });
  // the beam of a drone as seen on this screen: apex, axis
  TrS2.beam = (e, outA, outD) => {
    outA.set(e.pos.x + Math.sin(e.yaw) * 0.4, e.pos.y - 0.22, e.pos.z + Math.cos(e.yaw) * 0.4);
    outD.set(Math.sin(e.yaw) * Math.cos(TILT), -Math.sin(TILT), Math.cos(e.yaw) * Math.cos(TILT));
    return { half: HALF, len: LEN };
  };
})();

(() => {
  // this épreuve's card, from the plan (js/game/trials.js)
  const CARD = Cards.tagOf('s2');
  const T = CONFIG;
  const W = TrS2;
  const TXT = {
    title: 'Les Toits qui tombent',
    card: CARD,
    intro: 'Épreuve d’adresse. Les toits de Terre 39 ne tiennent plus. Ils tombent derrière vous.',
    rhythm: {
      dame: 'Saute de toit en toit. Les tuiles rouges craquent : ne t’arrête jamais dessus. Plus loin, vise l’anneau (F) et descends l’échelle à {mate}.',
      valet:
        'Saute de toit en toit. Les tuiles rouges craquent : ne t’arrête jamais dessus. Le bloc en hauteur, c’est {mate} qui t’y fera monter.',
    },
    ladder: {
      dame: 'L’échelle est descendue. La planche est trop lourde pour toi : seul{pe} {mate} peut la pousser, depuis le château d’eau.',
      valet: 'Monte l’échelle. Là-haut, double saut jusqu’au château d’eau, et pousse la planche (E) : elle est trop lourde pour {mate}.',
    },
    plank: 'La planche tient. Traversez, puis les pierres qui s’effritent : vite, sans vous arrêter.',
    zip: 'Point de reprise. Montez sur la plateforme et prenez la tyrolienne (E).',
    crane: 'Le crochet de la grue balance au-dessus du vide : sautez dessus, et sautez de l’autre côté.',
    board: 'Le panneau ne glisse que si quelqu’un tient un levier (E maintenu). L’un tient, l’autre traverse. Puis on inverse.',
    boardFar: 'Tiens le levier de ce côté (E maintenu) pour ramener le panneau à {mate}.',
    drones: {
      dame: 'Les drones du Joker volent : abats-les au fusil, cache-toi de leurs projecteurs. Les gardes au bouclier, ton fusil rebondit dessus : laisse {mate} les sonner à l’épée, puis tire. Le toit s’effondre derrière vous : avancez !',
      valet:
        'Les drones volent trop haut pour ton épée : c’est {mate} qui les abat. Toi, brise le bouclier des gardes à l’épée (son fusil n’y peut rien), et deviens invisible avec le Voile (F). Le toit s’effondre derrière vous : avancez !',
    },
    leap: {
      dame: 'Le dernier vide. Vise l’anneau (F) pour passer, puis sur le cœur, tends la main à {mate} (E maintenu).',
      valet: 'Le dernier vide est trop grand, même pour toi. Va sur le cercle bleu et attends que {mate} te tende la main.',
    },
    caught: {
      dame: 'Tu l’as rattrapé{pe}. La carte vous attend, sous le cœur.',
      valet: '{Il} t’a rattrapé{e}. La carte vous attend, sous le cœur.',
    },
    cardObj: 'La carte. Allez-y ensemble.',
    zapped: 'Le projecteur t’a vu{e}.',
    reset: 'Le toit s’est effondré sous vous. Le Joker recommence la course.',
    wipe: 'Vous êtes tombés tous les deux. Le Joker recommence la course.',
    wait: 'Attends que {mate} te tende la main, de l’autre côté.',
    heavy: 'Trop lourde pour toi : c’est {mate} qui peut la pousser',
  };
  T.cards.s2 = {
    title: TXT.title,
    sub: 'Épreuve ♠ · réussie',
    lines: [
      'Les toits tombaient. Vous n’avez jamais regardé derrière.',
      'L’un descendait l’échelle, l’autre poussait la planche.',
      'Et au bord du dernier vide, une main tendue a suffi.',
    ],
  };

  const local = {
    sec: 0,
    maxZ: -99,
    tiles: [],
    front: -1,
    frontT: 0,
    zip: null,
    hold: null,
    seen: 0,
    arc: null,
    catchSeen: 0,
    craneSend: 0,
    win: 0,
    wipe: 0,
    obj: '',
    hpose: 0,
    ladderSeen: false,
    plankSeen: false,
    reset: 0,
  };
  const st = { cranePh: 0, boardMoving: false, boardDX: 0, sec: 1 };
  const A = V3();
  const D = V3();
  const tmp = V3();
  const SPEED = 1.55;
  const GRACE = 9;
  const FRONT0 = 279;
  const FRONT_END = 368;

  const spots = [];
  const makeSpot = () => {
    const m = new THREE.Mesh(
      new THREE.CircleGeometry(1, 32).rotateX(-Math.PI / 2),
      new THREE.MeshBasicMaterial({
        color: new THREE.Color('#ff2a3a').multiplyScalar(1.3),
        transparent: true,
        opacity: 0.4,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
        toneMapped: false,
      }),
    );
    R.scene.add(m);
    return m;
  };
  const players = (c) =>
    ['dame', 'valet'].map((who) => {
      const me = who === c.role;
      const rs = c.remoteState();
      return {
        who,
        pos: c.pos(who),
        down: me ? Combat.down : !!rs.down,
        cloak: me ? Combat.cloak > 0 : !!rs.cloak,
      };
    });
  const DRONES = [
    { home: [0, 7.2, 296], span: 5.5, spanZ: 3, spd: 0.5, sweep: 0.8 },
    { home: [2, 7.6, 309], span: 4.5, spanZ: 4, spd: 0.42, sweep: 1.1 },
    { home: [-1, 7.2, 333], span: 5, spanZ: 4, spd: 0.55, sweep: 0.9 },
    { home: [1, 8.4, 362], span: 5.5, spanZ: 4, spd: 0.48, sweep: 1.0 },
  ];
  // the shield guards on the strips, in the way of the run
  const GUARDS = [
    [2, 0, 301],
    [-2.5, 0, 313],
    [0.5, 0, 336],
    [-2, 1.2, 358],
    [2.5, 1.2, 373],
  ];
  const spawnDrones = () => {
    Enemies.clear();
    GUARDS.forEach((p) => Enemies.spawn('gardeToit', W.P(...p), { shield: true, yaw: Math.PI }));
    DRONES.forEach((d) =>
      Enemies.spawn('drone', W.P(...d.home), {
        span: d.span,
        spanZ: d.spanZ,
        spd: d.spd,
        sweep: d.sweep,
        face: Math.PI,
      }),
    );
  };
  const tl = (x) => x.tl || '';
  const setTile = (c, id, ch) =>
    c.set((s) => {
      const a = (s.x.tl || '').padEnd(W.pieces.length, '0').split('');
      a[id] = ch;
      s.x.tl = a.join('');
    });

  // ---------- section 3 reset: strips back, drones back, both on the last checkpoint ----------
  const resetSec3 = (c, msg) => {
    local.front = -1;
    local.frontT = 0;
    c.set((s) => {
      const a = (s.x.tl || '').padEnd(W.pieces.length, '0').split('');
      W.pieces.forEach((p) => {
        if (p.kind === 's' || p.z > 280) a[p.id] = '0';
      });
      s.x.tl = a.join('');
      s.x.reset = (s.x.reset || 0) + 1;
      s.x.msg = msg;
    });
    spawnDrones();
  };

  const objectiveFor = (c, q) => {
    const x = c.S.x;
    const r = c.role;
    if (x.sec >= 5) return TXT.cardObj;
    if (x.sec === 4 || q.z > 372) return local.caught ? TXT.cardObj : TXT.leap[r];
    if (x.sec === 3 || q.z > 282) return TXT.drones[r];
    if (q.z > 244 && q.z < 290) return TXT.boardFar;
    if (q.z > 220) return TXT.board;
    if (q.z > 168) return TXT.crane;
    if (q.z > 112) return TXT.zip;
    if (x.plank) return TXT.plank;
    if (x.ladder) return TXT.ladder[r];
    return TXT.rhythm[r];
  };

  Story.register('tr_s2', {
    init: () => ({ sec: 1, tl: '', ladder: false, plank: false, hold: [], reach: false, catch: 0, reset: 0 }),
    voice: () => 1,
    net: {
      en: (c, d) => !Net.isHost && Enemies.unpack(d),
      cr: (c, ph) => {
        if (Net.isHost) return;
        const lat = ((Net.rtt || 80) / 2000) * ((Math.PI * 2) / W.CRANE.period);
        let target = ph + lat;
        const diff = Math.atan2(Math.sin(target - st.cranePh), Math.cos(target - st.cranePh));
        st.cranePh += Math.abs(diff) > 1 ? diff : diff * 0.35;
      },
      zap: (c, p) => {
        const v = V3(p[0], p[1], p[2]);
        Fx.burst(v, '#ff2a3a', 40, 5, 0.6, -3);
        Sound.play('shoot', v);
      },
    },
    async enter(c, first) {
      if (!first) await fadeTo(true);
      W.build();
      Enemies.clear();
      local.sec = 0;
      local.maxZ = -99;
      local.zip = null;
      local.arc = null;
      local.caught = false;
      local.reset = c.S.x.reset || 0;
      local.catchSeen = c.S.x.catch || 0;
      local.ladderSeen = !!c.S.x.ladder;
      local.plankSeen = !!c.S.x.plank;
      c.spawn(W.spawn(c.S.x.sec, c.role), 0);
      Player.killY = W.O.y - 12;
      Player.checkpoint = () => {
        const x = Story.S.x;
        if (x.sec === 3) {
          // a fall in the run: the whole run starts again, for both
          Story.ctx.act({ a: 'fell' });
          return W.spawn(3, Story.role);
        }
        if (x.sec >= 4) return W.P(Story.role === 'dame' ? -1.5 : 1.5, 1.2, 380);
        return W.checkpoint(local.maxZ, Story.role);
      };
      Player.targets = () =>
        c.role === 'dame'
          ? [W.P(W.RING1.x, W.RING1.y, W.RING1.z), Story.S.x.sec >= 3 ? W.P(W.RING2.x, W.RING2.y, W.RING2.z) : null]
          : [];
      Player.grappleLand = () => {
        const L = Player.target === 1 ? W.LAND2 : W.LAND1;
        return W.P(L.x, L.y, L.z);
      };
      City.mood({});
      c.fog(0.011);
      Sound.mood('calm');
      HUD.visa(TXT.card + ' · ' + TXT.title);
      W.screen.show(TXT.card, TXT.title, '#b9a6ff');
      if (!first) {
        await sleep(300);
        fadeTo(false);
      }
      HUD.say(TXT.intro, T.master, 3600);
      this.apply(c);
    },
    exit() {
      spots.forEach((s2) => (s2.visible = false));
      Combat.enable(false);
      Enemies.clear();
      Player.targets = null;
      Player.grappleLand = null;
      Player.handPose = false;
      Remote.handPose = false;
      if (Player.mode === 'hang') Player.mode = 'walk';
      Player.hangPos = null;
      Player.avatar.ghost(0);
    },
    apply(c) {
      if (!W.built) return;
      const x = c.S.x;
      st.sec = x.sec;
      if (x.sec !== local.sec) {
        const was = local.sec;
        local.sec = x.sec;
        if (x.sec >= 3 && x.sec < 4 && !Combat.on) Combat.enable(true);
        if (x.sec >= 4 && Combat.on) Combat.enable(false);
        if (x.sec === 2 && was) {
          Sound.play('reveal');
          W.screen.show('2 / 3', 'La grue et le panneau', '#ffcf8a');
        }
        if (x.sec === 3) {
          Sound.mood('tense');
          Sound.play('glitch');
          HUD.say(TXT.drones[c.role], T.joker, 4200);
          W.screen.show('3 / 3', 'Le Joker vous chasse', '#ff2a3a');
        }
        if (x.sec === 4) {
          Sound.mood('calm');
          Sound.play('reveal');
          HUD.say(TXT.leap[c.role], T.master, 4200);
        }
      }
      if (x.ladder && !local.ladderSeen) {
        local.ladderSeen = true;
        Sound.play('lift');
        Sound.play('door');
        HUD.say(TXT.ladder[c.role], T.master, 3600);
      }
      if (x.plank && !local.plankSeen) {
        local.plankSeen = true;
        Sound.play('creak');
        HUD.say(TXT.plank, T.master, 3200);
      }
      if ((x.reset || 0) !== local.reset) {
        local.reset = x.reset || 0;
        Combat.reset();
        c.spawn(W.spawn(3, c.role), 0);
        HUD.say(x.msg === 'wipe' ? TXT.wipe : TXT.reset, T.joker, 3000);
        Sound.play('glitch');
      }
      if ((x.catch || 0) !== local.catchSeen) {
        local.catchSeen = x.catch || 0;
        // the Valet flies, the Dame catches: both screens play it
        local.hpose = 2.2;
        if (c.role === 'valet') {
          const from = Player.body.p.clone();
          const to = W.P(W.CATCH.x + 1.1, W.CATCH.y, W.CATCH.z + 0.6);
          local.arc = { from, to, t: 0, dur: 1.5 };
          Player.mode = 'hang';
        }
        Sound.play('launch');
        setTimeout(() => {
          Fx.hearts(W.P(W.CATCH.x + 0.5, W.CATCH.y + 1.6, W.CATCH.z + 0.3));
          Sound.play('chime');
          Cam.shake = Math.max(Cam.shake, 0.2);
        }, 1400);
        local.caught = true;
        HUD.say(TXT.caught[c.role], T.master, 3000);
      }
    },
    host(c, dt) {
      if (!W.built) return;
      const x = c.S.x;
      const ps = players(c);
      const qd = W.rel(ps[0].pos);
      const qv = W.rel(ps[1].pos);
      const qs = [qd, qv];
      // section progress
      if (x.sec === 1 && qs.every((q) => q.z > 113.5 && q.z < 131)) c.set((s) => (s.x.sec = 2));
      if (x.sec <= 2 && qs.every((q) => q.z > 263.5 && q.z < 282)) {
        c.set((s) => (s.x.sec = 3));
        spawnDrones();
        local.front = -1;
        local.frontT = 0;
      }
      if (x.sec === 3 && qs.every((q) => q.z > 373 && q.y > 0.6)) {
        c.set((s) => (s.x.sec = 4));
        Enemies.clear();
        Enemies.netTick(1);
      }
      // crumbling tiles: crack when stood on, fall, come back
      const s = tl(x);
      W.pieces.forEach((p) => {
        const ch = s[p.id] || '0';
        const lt = (local.tiles[p.id] = local.tiles[p.id] || { t: 0 });
        if (p.kind === 't') {
          const on = qs.some(
            (q) =>
              Math.abs(q.x - p.x) < p.w / 2 + 0.25 &&
              Math.abs(q.z - p.z) < p.d / 2 + 0.25 &&
              Math.abs(q.y - p.y) < 0.35,
          );
          if (ch === '0' && on) {
            lt.t = 0;
            setTile(c, p.id, '1');
          } else if (ch === '1') {
            lt.t += dt;
            if (lt.t > p.delay) {
              lt.t = 0;
              setTile(c, p.id, '2');
            }
          } else if (ch === '2') {
            lt.t += dt;
            if (lt.t > p.back) {
              lt.t = 0;
              setTile(c, p.id, '0');
            }
          }
        } else {
          // strips: the collapse front behind you (a cracking strip always finishes falling)
          if (ch === '0' && x.sec === 3 && local.front > 0 && local.front > p.z - 2) {
            lt.t = 0;
            setTile(c, p.id, '1');
          } else if (ch === '1') {
            lt.t += dt;
            if (lt.t > 0.9) setTile(c, p.id, '2');
          }
        }
      });
      if (x.sec === 3) {
        local.frontT += dt;
        // the front waits while someone is down: the partner gets the time to come back for you
        const anyDown = ps[0].down || ps[1].down;
        if (local.frontT > GRACE && !anyDown) {
          if (local.front < 0) local.front = FRONT0;
          local.front = Math.min(FRONT_END, local.front + SPEED * dt);
        }
        Enemies.simulate(dt, ps);
        Enemies.netTick(dt);
        if (ps[0].down && ps[1].down) {
          local.wipe += dt;
          if (local.wipe > 2) {
            local.wipe = 0;
            resetSec3(c, 'wipe');
          }
        } else local.wipe = 0;
      }
      // crane phase for the guest
      local.craneSend -= dt;
      if (local.craneSend <= 0) {
        local.craneSend = 0.5;
        c.send('cr', +st.cranePh.toFixed(3));
      }
      // the end: both by the card
      if (x.sec >= 4 && x.catch && qs.every((q) => Math.hypot(q.x - W.CARD.x, q.z - W.CARD.z) < 3.4 && q.y > 1)) {
        local.win += dt;
        if (local.win > 0.6) c.goto('reward', (s2) => (s2.x.card = 's2'));
      } else local.win = 0;
    },
    action(c, who, d) {
      const x = c.S.x;
      if (d.a === 'winch' && !x.ladder) c.set((s) => (s.x.ladder = true));
      if (d.a === 'plank' && !x.plank) c.set((s) => (s.x.plank = true));
      if (d.a === 'hold') {
        const id = d.id;
        const cur = (x.hold || []).filter((h) => h !== id);
        if (d.on) cur.push(id);
        c.set((s) => {
          s.x.hold = cur;
          if (id === 'catch') s.x.reach = !!d.on;
        });
      }
      if (d.a === 'leap' && x.reach) c.set((s) => (s.x.catch = (s.x.catch || 0) + 1));
      if (d.a === 'fell' && x.sec === 3) resetSec3(c, 'fall');
      if (d.a === 'hit') Enemies.damage(d.id, d.dmg, d.stun || 0, !!d.weak);
      if (d.a === 'revive') {
        const target = who === 'dame' ? 'valet' : 'dame';
        if (target === c.role) Combat.revived();
        else c.send('revived');
      }
    },
    update(c, dt, t) {
      if (!W.built) return null;
      const x = c.S.x;
      W.update(dt, t, x, st);
      Enemies.render(dt, t);
      const b = Player.body;
      const q = W.rel(b.p);
      if (b.grounded) local.maxZ = Math.max(local.maxZ, q.z);
      HUD.objective(objectiveFor(c, q));

      // hollow roofs: the physics pushes a body under a box it overlaps while going up; there
      // is no building below a tile or a strip to catch you, so put you back on top of it
      if (Player.mode === 'walk' && !b.grounded) {
        const s2 = x.tl || '';
        for (const p of W.pieces) {
          if ((s2[p.id] || '0') === '2') continue;
          if (Math.abs(q.x - p.x) > p.w / 2 || Math.abs(q.z - p.z) > p.d / 2) continue;
          if (q.y < p.y - 0.02 && q.y > p.y - 2.6) {
            b.p.y = W.O.y + p.y;
            b.v.y = Math.max(0, b.v.y);
          }
          break;
        }
      }
      // riding the crane hook and the sliding billboard
      if (b.ground === W.craneBox) b.p.add(W.craneDelta);
      if (b.ground === W.boardBox && st.boardDX < 0) b.p.x += st.boardDX;

      // the catch: hands meet in the air (both screens)
      if (local.hpose > 0) {
        local.hpose -= dt;
        Player.handPose = local.hpose > 0;
        Remote.handPose = local.hpose > 0;
      }
      if (local.arc) {
        const a = local.arc;
        a.t += dt / a.dur;
        const k = Math.min(1, a.t);
        const e = k * k * (3 - 2 * k);
        const p = a.from.clone().lerp(a.to, e);
        p.y += Math.sin(k * Math.PI) * 4.2;
        Player.hangPos = p;
        Player.mode = 'hang';
        Player.yaw = 0;
        if (k >= 1) {
          local.arc = null;
          Player.mode = 'walk';
          Player.hangPos = null;
          b.p.copy(a.to);
          b.v.set(0, 0, 0);
          Sound.play('land', 0.6);
        }
        return null;
      }
      // the zip line: hang under the cable and slide down
      if (local.zip) {
        const z = local.zip;
        z.v = Math.min(14, z.v + dt * 9);
        z.k += (z.v * dt) / W.zipLen;
        if (Input.pressed('jump') && z.k > 0.1) {
          local.zip = null;
          Player.mode = 'walk';
          Player.hangPos = null;
          b.v.set(0, 2, z.v * 0.8);
          return null;
        }
        if (z.k >= 1) {
          local.zip = null;
          Player.mode = 'walk';
          Player.hangPos = null;
          b.v.set(0, 0, 4);
          Sound.play('land', 0.5);
          return null;
        }
        W.zipAt(z.k, tmp);
        tmp.y -= 2.1;
        Player.hangPos = tmp.clone();
        Player.mode = 'hang';
        Player.yaw = 0;
        if (Math.random() < dt * 25)
          Fx.burst(W.zipAt(z.k, V3()).add(V3(0, 0.1, 0)), '#ffcf8a', 2, 2, 0.3, -6);
        return null;
      }

      // where each searchlight touches the roof: a red spot, so the danger reads from afar
      let si = 0;
      for (const e of Enemies.list.values()) {
        if (e.type !== 'drone') continue;
        const sp = spots[si] || (spots[si] = makeSpot());
        si++;
        const bm = W.beam(e, A, D);
        const hit = Phys.ray(A, D, bm.len);
        sp.visible = !(e.stun > 0) && hit < bm.len;
        if (sp.visible) {
          sp.position.copy(A).addScaledVector(D, hit - 0.02);
          sp.scale.setScalar(Math.tan(bm.half) * hit * 1.05);
          sp.material.opacity = 0.35 + 0.15 * Math.sin(t * 10 + e.id);
        }
      }
      for (; si < spots.length; si++) spots[si].visible = false;
      // drone beams: this screen checks this player
      if (x.sec === 3 && Combat.on && !Combat.down) {
        let inBeam = false;
        const chest = tmp.set(b.p.x, b.p.y + 1.2, b.p.z);
        if (Combat.cloak <= 0)
          for (const e of Enemies.list.values()) {
            if (e.type !== 'drone' || e.stun > 0) continue;
            const bm = W.beam(e, A, D);
            const v = chest.clone().sub(A);
            const dist = v.length();
            if (dist > bm.len || dist < 0.5) continue;
            v.multiplyScalar(1 / dist);
            if (v.dot(D) < Math.cos(bm.half + 0.03)) continue;
            if (Phys.ray(A, v, dist) < dist - 0.6) continue;
            inBeam = true;
            break;
          }
        local.seen = inBeam ? local.seen + dt : Math.max(-1, local.seen - dt * 2);
        HUD.danger(clamp(local.seen * 2.2, 0, 0.9));
        if (local.seen > 0.32) {
          local.seen = -0.9;
          Combat.apply(28);
          b.v.set(0, 5, 0);
          const p = b.p.clone().add(V3(0, 1.2, 0));
          Fx.burst(p, '#ff2a3a', 40, 5, 0.6, -3);
          Sound.play('trap');
          c.send('zap', p.toArray().map((v) => +v.toFixed(2)));
          if (!Combat.down) HUD.say(TXT.zapped, T.joker, 1400);
        }
      } else HUD.danger(0);
      const prompt = Combat.on ? Combat.update(dt) : null;
      if (prompt) return prompt;

      // lever holds (billboard and the catch)
      const hold = (id, near, label) => {
        const on = near && Input.held('interact');
        if (on !== (local.hold === id)) {
          if (on) {
            local.hold = id;
            c.act({ a: 'hold', id, on: true });
            Sound.play('switch');
          } else if (local.hold === id) {
            local.hold = null;
            c.act({ a: 'hold', id, on: false });
          }
        }
        return near ? ['E', label, true] : null;
      };
      const dist = (p) => Math.hypot(q.x - p.x, q.z - p.z) + Math.abs(q.y - p.y) * 0.5;
      if (dist(W.LEVER1) < 1.8) return hold('l1', true, 'Tenir le levier');
      if (dist(W.LEVER2) < 1.8) return hold('l2', true, 'Tenir le levier');
      if (c.role === 'dame' && x.sec >= 4 && !x.catch && dist(W.CATCH) < 1.7)
        return hold('catch', true, 'Tendre la main à ' + Story.name('valet'));
      if (local.hold) hold(local.hold, false);

      if (dist(W.WINCH) < 1.9 && Math.abs(q.y - W.WINCH.y) < 0.5 && !x.ladder) {
        if (Input.pressed('interact')) c.act({ a: 'winch' });
        return ['E', 'Descendre l’échelle'];
      }
      if (dist(W.PLANK_LEVER) < 1.8 && Math.abs(q.y - W.PLANK_LEVER.y) < 0.5 && !x.plank) {
        if (c.role !== 'valet') return ['E', TXT.heavy];
        if (Input.pressed('interact')) c.act({ a: 'plank' });
        return ['E', 'Pousser la planche'];
      }
      if (dist(V3(W.ZIP_A.x, W.ZIP_A.y - 2.1, W.ZIP_A.z)) < 1.9 && Player.mode === 'walk') {
        if (Input.pressed('interact')) {
          local.zip = { k: 0, v: 3 };
          Sound.play('grapple');
        }
        return ['E', 'Tyrolienne'];
      }
      if (c.role === 'valet' && x.sec >= 4 && !local.caught && dist(W.PAD) < 2) {
        if (x.reach) {
          if (Input.pressed('interact') || Input.pressed('jump')) c.act({ a: 'leap' });
          return ['Espace', 'Sauter vers ' + Story.name('dame')];
        }
        return [null, TXT.wait];
      }
      return null;
    },
  });
})();
