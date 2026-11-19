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
      // RSE meteorite: step out of the target zone, and don't wander back into it until it has landed
      let dodge = 0, hold = false;
      for (const m of w.meteors) {
        if (m.gone || (m.state === 'boom' && m.boomT > 0.3)) continue;
        const dx = p.x - m.tx;
        if (Math.abs(dx) < 105) dodge = dx > 0 || (dx === 0 && p.x < 420) ? 1 : -1;
        else if (Math.abs(dx) < 150) hold = true;
      }
      if (dodge) { inp.right = dodge > 0; inp.left = dodge < 0; }
      else if (hold) { inp.left = false; inp.right = false; }

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
