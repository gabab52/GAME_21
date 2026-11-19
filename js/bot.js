/* A tiny autoplayer. Drives the attract-mode demo behind the title screen and powers the headless tests. */
(function () {
  const Q = (globalThis.Q = globalThis.Q || {});
  const C = Q.C;

  Q.Bot = {
    decide(w) {
      const p = w.player;
      const s = w.scroll;
      const inp = { left: false, right: false, down: false, jumpHeld: false, jumpPressed: false, throwPressed: false, bombPressed: false };
      const home = 190;
      if (p.x < home - 15) inp.right = true; else if (p.x > home + 15) inp.left = true;

      let jump = false;
      const front = p.x + p.w / 2;
      const reach = s * 0.21 + 22;
      for (const o of w.obstacles) {
        const dx = o.x - front;
        if (dx > -o.w && dx < reach) jump = true;
      }
      let fight = false;
      for (const e of w.enemies) {
        if (e.dead) continue;
        const dx = e.x - p.x;
        if (e.kind === 'oldman') {
          if (e.state === 'lunge' && dx > -40 && dx < 240) jump = true;
          else if (e.state !== 'enter' && e.state !== 'leave') fight = true;
        } else if (e.kind === 'cat') {
          if (dx > -30 && dx < (e.state === 'leap' ? 150 : 120)) jump = true;
          if (e.state === 'run' && dx > 250) fight = true;
        }
      }
      if (p.onGround && jump) inp.jumpPressed = true;
      inp.jumpHeld = !p.onGround || jump;
      if (fight && p.onGround && w.ammo > 0 && Math.floor(w.t * 6) % 2 === 0) inp.throwPressed = true;
      if (w.hearts <= 1 && w.bombs > 0 && w.enemies.some((e) => !e.dead && e.x < C.W - 40 && e.x > p.x)) inp.bombPressed = true;
      return inp;
    },
  };
})();
