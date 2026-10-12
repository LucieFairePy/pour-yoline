const Input = (() => {
  const keys = new Set();
  const mouse = new Set();
  const prev = {};
  const now = {};
  const look = { x: 0, y: 0 };
  const sim = { x: 0, z: 0, held: new Set() };
  let locked = false;
  let pad = null;
  let enabled = false;

  const MAP = {
    jump: { k: ['Space'], b: [0] },
    sprint: { k: ['ShiftLeft', 'ShiftRight'], b: [10, 4] },
    interact: { k: ['KeyE'], b: [2] },
    ability: { k: ['KeyF'], m: [2], b: [5] },
    attack: { k: [], m: [0], b: [7] },
    call: { k: ['KeyC'], b: [3] },
    pause: { k: ['Escape'], b: [9] },
    deck: { k: ['KeyP', 'Tab'], b: [8] },
  };

  addEventListener('keydown', (e) => {
    if (e.target.tagName === 'INPUT' || e.target.tagName === 'SELECT') return;
    keys.add(e.code);
    if (enabled && ['Space', 'ArrowUp', 'ArrowDown', 'Tab'].includes(e.code)) e.preventDefault();
  });
  addEventListener('keyup', (e) => keys.delete(e.code));
  addEventListener('blur', () => {
    keys.clear();
    mouse.clear();
  });
  addEventListener('mousedown', (e) => {
    if (locked) mouse.add(e.button);
  });
  addEventListener('mouseup', (e) => mouse.delete(e.button));
  addEventListener('contextmenu', (e) => enabled && e.preventDefault());
  addEventListener('mousemove', (e) => {
    if (!locked) return;
    look.x += e.movementX * 0.0022;
    look.y += e.movementY * 0.0022;
  });
  document.addEventListener('pointerlockchange', () => {
    locked = document.pointerLockElement === $('gl');
  });

  const dz = (v) => (Math.abs(v) < 0.15 ? 0 : (v - Math.sign(v) * 0.15) / 0.85);

  const poll = () => {
    pad = null;
    const pads = navigator.getGamepads ? navigator.getGamepads() : [];
    for (const p of pads) if (p && p.connected) pad = p;
    for (const a in MAP) {
      const m = MAP[a];
      let v = sim.held.has(a);
      if (enabled) {
        v = v || m.k.some((k) => keys.has(k));
        if (m.m) v = v || m.m.some((b) => mouse.has(b));
        if (pad) v = v || m.b.some((b) => pad.buttons[b] && pad.buttons[b].pressed);
      }
      prev[a] = now[a];
      now[a] = v;
    }
  };

  return {
    poll,
    get locked() {
      return locked;
    },
    get pad() {
      return !!pad;
    },
    set enabled(v) {
      enabled = v;
      if (!v) keys.clear();
    },
    get enabled() {
      return enabled;
    },
    sim,
    rawPad(buttons) {
      const pads = navigator.getGamepads ? navigator.getGamepads() : [];
      for (const p of pads)
        if (p && p.connected && buttons.some((b) => p.buttons[b] && p.buttons[b].pressed))
          return true;
      return false;
    },
    lock() {
      const c = $('gl');
      if (c.requestPointerLock && !locked) {
        try {
          const r = c.requestPointerLock();
          if (r && r.catch) r.catch(() => {});
        } catch (e) {}
      }
    },
    unlock() {
      if (document.exitPointerLock) document.exitPointerLock();
    },
    held: (a) => !!now[a],
    pressed: (a) => !!now[a] && !prev[a],
    released: (a) => !now[a] && !!prev[a],
    move() {
      let x = sim.x;
      let z = sim.z;
      if (enabled) {
        if (keys.has('KeyW') || keys.has('ArrowUp')) z += 1;
        if (keys.has('KeyS') || keys.has('ArrowDown')) z -= 1;
        if (keys.has('KeyA') || keys.has('ArrowLeft')) x -= 1;
        if (keys.has('KeyD') || keys.has('ArrowRight')) x += 1;
        if (pad) {
          x += dz(pad.axes[0] || 0);
          z -= dz(pad.axes[1] || 0);
        }
      }
      const l = Math.hypot(x, z);
      if (l > 1) {
        x /= l;
        z /= l;
      }
      return { x, z };
    },
    look(dt) {
      let x = look.x;
      let y = look.y;
      look.x = look.y = 0;
      if (enabled && pad) {
        x += dz(pad.axes[2] || 0) * 2.6 * dt;
        y += dz(pad.axes[3] || 0) * 2 * dt;
      }
      return { x: x * SETTINGS.sens, y: y * SETTINGS.sens * (SETTINGS.invert ? -1 : 1) };
    },
  };
})();
