/* Small helpers shared by logic and rendering. */
(function () {
  const Q = (globalThis.Q = globalThis.Q || {});

  const U = {
    clamp: (v, a, b) => (v < a ? a : v > b ? b : v),
    lerp: (a, b, t) => a + (b - a) * t,
    smooth: (t) => t * t * (3 - 2 * t),
    rand: (a, b) => a + Math.random() * (b - a),
    randInt: (a, b) => Math.floor(a + Math.random() * (b - a + 1)),
    chance: (p) => Math.random() < p,
    pick: (arr) => arr[Math.floor(Math.random() * arr.length)],

    /** weighted pick: items = [{w:number, ...}] ; entries with w<=0 are skipped */
    wpick(items) {
      let total = 0;
      for (const it of items) if (it.w > 0) total += it.w;
      if (total <= 0) return null;
      let r = Math.random() * total;
      for (const it of items) {
        if (it.w <= 0) continue;
        r -= it.w;
        if (r <= 0) return it;
      }
      return items[items.length - 1];
    },

    /** Rect from bottom-centre anchor. */
    rect: (cx, bottom, w, h) => ({ l: cx - w / 2, r: cx + w / 2, t: bottom - h, b: bottom }),
    /** Rect from centre anchor. */
    crect: (cx, cy, w, h) => ({ l: cx - w / 2, r: cx + w / 2, t: cy - h / 2, b: cy + h / 2 }),
    overlap: (a, b) => a.l < b.r && a.r > b.l && a.t < b.b && a.b > b.t,
    shrink: (r, d) => ({ l: r.l + d, r: r.r - d, t: r.t + d, b: r.b - d }),
  };

  Q.U = U;
})();
