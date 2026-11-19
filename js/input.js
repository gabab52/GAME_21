/* Keyboard + on-screen touch input. Produces a per-frame snapshot for the world. */
(function () {
  const Q = (globalThis.Q = globalThis.Q || {});

  const KEYMAP = {
    ArrowLeft: 'left', KeyA: 'left',
    ArrowRight: 'right', KeyD: 'right',
    Space: 'jump', ArrowUp: 'jump', KeyW: 'jump',
    ArrowDown: 'down', KeyS: 'down',
    KeyX: 'throw', KeyK: 'throw',
    KeyZ: 'bomb', KeyJ: 'bomb',
    KeyP: 'pause', Escape: 'pause',
    KeyM: 'mute',
    Enter: 'confirm',
  };
  const HELD = ['left', 'right', 'jump', 'down'];
  const EDGE = ['jump', 'throw', 'bomb'];

  const held = { left: false, right: false, jump: false, down: false };
  const edge = { jump: false, throw: false, bomb: false };
  const handlers = {}; // one-shot UI actions: pause, mute, confirm, any

  function press(name) {
    if (HELD.includes(name)) held[name] = true;
    if (EDGE.includes(name)) edge[name] = true;
    if (name === 'pause' || name === 'mute' || name === 'confirm') fire(name);
    fire('any');
  }
  function release(name) {
    if (HELD.includes(name)) held[name] = false;
  }
  function fire(name) {
    (handlers[name] || []).forEach((fn) => fn());
  }

  window.addEventListener('keydown', (e) => {
    const name = KEYMAP[e.code];
    if (!name) return;
    if (['Space', 'ArrowUp', 'ArrowDown', 'ArrowLeft', 'ArrowRight'].includes(e.code)) e.preventDefault();
    if (e.repeat) return;
    press(name);
  });
  window.addEventListener('keyup', (e) => {
    const name = KEYMAP[e.code];
    if (name) release(name);
  });
  window.addEventListener('blur', () => {
    HELD.forEach((k) => (held[k] = false));
  });

  // Touch / pointer buttons: any element with data-key="left|right|jump|throw|bomb|down"
  function bindTouch(root) {
    root.querySelectorAll('[data-key]').forEach((el) => {
      const name = el.dataset.key;
      const down = (e) => {
        e.preventDefault();
        el.classList.add('down');
        press(name);
        try { el.setPointerCapture(e.pointerId); } catch (_) {}
      };
      const up = (e) => {
        e.preventDefault();
        el.classList.remove('down');
        release(name);
      };
      el.addEventListener('pointerdown', down);
      el.addEventListener('pointerup', up);
      el.addEventListener('pointercancel', up);
      el.addEventListener('lostpointercapture', up);
      el.addEventListener('contextmenu', (e) => e.preventDefault());
    });
  }

  Q.Input = {
    on(name, fn) { (handlers[name] = handlers[name] || []).push(fn); },
    bindTouch,
    /** Build the snapshot consumed by World.update and clear one-shot edges. */
    snapshot() {
      const s = {
        left: held.left, right: held.right, down: held.down,
        jumpHeld: held.jump,
        jumpPressed: edge.jump, throwPressed: edge.throw, bombPressed: edge.bomb,
      };
      edge.jump = edge.throw = edge.bomb = false;
      return s;
    },
    clearEdges() { edge.jump = edge.throw = edge.bomb = false; },
    clearHeld() { HELD.forEach((k) => (held[k] = false)); },
  };
})();
