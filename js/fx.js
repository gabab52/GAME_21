/* Visual-only state: particles, floating text, speech bubbles, screen shake & flash. Driven by world events. */
(function () {
  const Q = (globalThis.Q = globalThis.Q || {});
  const U = Q.U;

  class FX {
    constructor() { this.reset(); }
    reset() {
      this.parts = [];
      this.texts = [];
      this.bubbles = [];
      this.shake = 0;
      this.flash = 0;
      this.flashColor = '#fff';
      this.glasses = [];
    }

    /** Generic particle burst. */
    burst(x, y, o) {
      const n = o.n || 8;
      for (let i = 0; i < n; i++) {
        const a = o.dir != null ? o.dir + U.rand(-(o.spread || 0.6), o.spread || 0.6) : Math.random() * Math.PI * 2;
        const sp = U.rand(o.min || 40, o.max || 240);
        const life = U.rand(o.life || 0.5, (o.life || 0.5) * 1.5);
        this.parts.push({
          x: x + U.rand(-(o.jx || 0), o.jx || 0), y: y + U.rand(-(o.jy || 0), o.jy || 0),
          vx: Math.cos(a) * sp, vy: Math.sin(a) * sp,
          life, max: life, size: U.rand(o.size || 3, (o.size || 3) * 1.6),
          color: Array.isArray(o.color) ? U.pick(o.color) : o.color || '#fff',
          shape: o.shape || 'dot', grav: o.grav == null ? 600 : o.grav, drag: o.drag || 0,
          rot: Math.random() * 6, vr: U.rand(-8, 8), grow: o.grow || 0,
        });
      }
    }
    ring(x, y, color, size, life) {
      this.parts.push({ x, y, vx: 0, vy: 0, life: life || 0.4, max: life || 0.4, size: size || 10, color, shape: 'ring', grav: 0, drag: 0, rot: 0, vr: 0, grow: (size || 10) * 9 });
    }
    text(x, y, str, o) {
      o = o || {};
      this.texts.push({ x, y, str, life: o.life || 0.9, max: o.life || 0.9, color: o.color || '#fff', size: o.size || 18, vy: o.vy == null ? -50 : o.vy, pop: o.pop !== false });
    }
    bubble(x, y, str, life) { this.bubbles.push({ x, y, str, life: life || 1.4, max: life || 1.4 }); }
    doShake(a) { this.shake = Math.max(this.shake, a); }
    doFlash(c, a) { this.flashColor = c || '#fff'; this.flash = Math.max(this.flash, a == null ? 1 : a); }

    update(dt, scroll) {
      for (const p of this.parts) {
        p.life -= dt;
        p.vy += p.grav * dt;
        if (p.drag) { const k = Math.max(0, 1 - p.drag * dt); p.vx *= k; p.vy *= k; }
        p.x += p.vx * dt - (p.world ? scroll * dt : 0); p.y += p.vy * dt; p.rot += p.vr * dt;
        if (p.grow) p.size += p.grow * dt;
      }
      this.parts = this.parts.filter((p) => p.life > 0);
      if (this.parts.length > 600) this.parts.splice(0, this.parts.length - 600);
      for (const t of this.texts) { t.life -= dt; t.y += t.vy * dt; }
      this.texts = this.texts.filter((t) => t.life > 0);
      for (const b of this.bubbles) b.life -= dt;
      this.bubbles = this.bubbles.filter((b) => b.life > 0);
      this.shake = Math.max(0, this.shake - dt * 40);
      this.flash = Math.max(0, this.flash - dt * 2.8);
    }
  }

  Q.FX = FX;
})();
