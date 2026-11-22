/* Renderer — draws a World + FX onto a canvas. Reads game state, never changes it. */
(function () {
  const Q = (globalThis.Q = globalThis.Q || {});
  const C = Q.C, U = Q.U, Art = Q.Art;
  const GY = C.GROUND;

  // ---- sky palettes: day → sunset → night → dawn, cycling with distance
  const PAL = [
    { top: '#8fd0ea', bot: '#fff0d2', sun: '#ffd166', far: '#d9cbb8', mid: '#b4d1c1', near: '#93bba7', gr: '#2b3a58', gl: '#41537b', cloud: '#ffffff', water: '#2fa8de', waterL: '#8fe3f7', star: 0 },
    { top: '#ee8a6e', bot: '#ffdca6', sun: '#ff6b5b', far: '#e6ad94', mid: '#cd8b7a', near: '#ad7070', gr: '#3a2f50', gl: '#55456f', cloud: '#ffe9d4', water: '#d8668a', waterL: '#ffb894', star: 0.15 },
    { top: '#131a3c', bot: '#4a4e8f', sun: '#f4f1de', far: '#2d3769', mid: '#242c58', near: '#1b2247', gr: '#0f1329', gl: '#222a4d', cloud: '#59609f', water: '#162a6e', waterL: '#4a6cc8', star: 1 },
    { top: '#6f80c6', bot: '#ffcab4', sun: '#ffb36b', far: '#b9a8c6', mid: '#9f91b5', near: '#867ba0', gr: '#2c3057', gl: '#444b7c', cloud: '#ffe5e1', water: '#4f78cc', waterL: '#b9b0ee', star: 0.3 },
  ];
  const STAGE = 9000; // px of travel per palette stage
  const KEYS = ['top', 'bot', 'sun', 'far', 'mid', 'near', 'gr', 'gl', 'cloud', 'water', 'waterL'];
  const hex = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
  const PALRGB = PAL.map((p) => { const o = { star: p.star }; KEYS.forEach((k) => (o[k] = hex(p[k]))); return o; });
  function mix(a, b, t) { return `rgb(${Math.round(a[0] + (b[0] - a[0]) * t)},${Math.round(a[1] + (b[1] - a[1]) * t)},${Math.round(a[2] + (b[2] - a[2]) * t)})`; }
  function paletteAt(dist) {
    const f = Math.max(0, dist) / STAGE, i = Math.floor(f) % PAL.length, k = U.smooth(f - Math.floor(f));
    const A = PALRGB[i], B = PALRGB[(i + 1) % PAL.length];
    const out = { star: U.lerp(A.star, B.star, k) };
    KEYS.forEach((key) => (out[key] = mix(A[key], B[key], k)));
    return out;
  }
  const hash = (n) => { const s = Math.sin(n * 127.1 + 311.7) * 43758.5453; return s - Math.floor(s); };

  // ---------------------------------------------------------------- Rome landmarks (silhouettes, base line y = b)
  // Each takes (ctx, x, b, far, dark): `far` = silhouette colour, `dark` = a deeper tone for arches/windows.
  function arch(ctx, x, yb, w, h) { // arched opening, bottom at yb
    ctx.beginPath(); ctx.moveTo(x, yb); ctx.lineTo(x, yb - h + w / 2); ctx.arc(x + w / 2, yb - h + w / 2, w / 2, Math.PI, 0); ctx.lineTo(x + w, yb); ctx.closePath(); ctx.fill();
  }
  function colosseum(ctx, x, b, f, d) {
    const W = 360, top = [[0, 144], [0.45, 152], [0.62, 150], [0.72, 128], [0.8, 120], [0.9, 98], [1, 84]];
    const H = (u) => { for (let i = 1; i < top.length; i++) if (u <= top[i][0]) { const a = top[i - 1], c = top[i]; return U.lerp(a[1], c[1], (u - a[0]) / (c[0] - a[0])); } return top[top.length - 1][1]; };
    ctx.fillStyle = f; ctx.beginPath(); ctx.moveTo(x, b);
    top.forEach(([u, h]) => ctx.lineTo(x + u * W, b - h)); ctx.lineTo(x + W, b); ctx.closePath(); ctx.fill();
    ctx.fillStyle = d;
    const n = 15, step = W / n;
    for (let r = 0; r < 3; r++) {       // three tiers of arches
      const yb = b - 6 - r * 38;
      for (let i = 0; i < n; i++) {
        const ax = x + i * step + (step - 14) / 2, u = (i * step + step / 2) / W;
        if (yb - 30 > b - H(u) + 8) arch(ctx, ax, yb, 14, 30);
      }
    }
    for (let i = 0; i < n; i++) {       // attic windows
      const u = (i * step + step / 2) / W, y = b - 6 - 3 * 38 + 4;
      if (y - 14 > b - H(u) + 6) ctx.fillRect(x + i * step + (step - 7) / 2, y - 14, 7, 14);
    }
    ctx.fillStyle = f; ctx.fillRect(x - 6, b - 4, W + 12, 4);
  }
  function peters(ctx, x, b, f, d) { // San Pietro: colonnades, facade, drum and the great dome with lantern
    const cx = x + 130;
    ctx.fillStyle = f;
    ctx.fillRect(x, b - 44, 260, 44);                       // colonnade wings
    ctx.fillRect(cx - 72, b - 80, 144, 80);                 // facade
    ctx.fillRect(cx - 76, b - 92, 152, 12);                 // attic
    for (let i = 0; i < 11; i++) ctx.fillRect(cx - 70 + i * 13.6, b - 102, 4, 10); // statues on the balustrade
    ctx.fillRect(cx - 36, b - 118, 72, 40);                 // drum
    ctx.beginPath(); ctx.ellipse(cx, b - 118, 38, 54, 0, Math.PI, 0); ctx.fill(); // dome
    ctx.fillRect(cx - 5, b - 184, 10, 16);                  // lantern
    ctx.beginPath(); ctx.moveTo(cx - 6, b - 184); ctx.lineTo(cx, b - 196); ctx.lineTo(cx + 6, b - 184); ctx.fill();
    ctx.fillRect(cx - 1, b - 210, 2, 16); ctx.fillRect(cx - 5, b - 205, 10, 2);       // cross
    ctx.fillStyle = d;
    for (let i = 0; i < 22; i++) ctx.fillRect(x + 4 + i * 11.6, b - 38, 4, 30);       // colonnade gaps
    for (let i = 0; i < 6; i++) ctx.fillRect(cx - 60 + i * 21, b - 70, 8, 22);        // facade windows
    for (let i = 0; i < 4; i++) ctx.fillRect(cx - 27 + i * 16, b - 112, 6, 18);        // drum windows
    ctx.strokeStyle = d; ctx.lineWidth = 2;
    for (let i = -2; i <= 2; i++) { ctx.beginPath(); ctx.moveTo(cx + i * 10, b - 118); ctx.quadraticCurveTo(cx + i * 7, b - 150, cx + i * 1.5, b - 168); ctx.stroke(); } // dome ribs
  }
  function pantheon(ctx, x, b, f, d) { // columned portico, pediment and the huge rotunda
    const cx = x + 118;
    ctx.fillStyle = f;
    ctx.fillRect(cx - 64, b - 66, 128, 66);                 // rotunda drum
    ctx.beginPath(); ctx.ellipse(cx, b - 66, 62, 42, 0, Math.PI, 0); ctx.fill(); // dome
    ctx.fillRect(x + 26, b - 64, 150, 64);                  // portico
    ctx.beginPath(); ctx.moveTo(x + 18, b - 62); ctx.lineTo(x + 184, b - 62); ctx.lineTo(x + 101, b - 92); ctx.closePath(); ctx.fill(); // pediment
    ctx.fillRect(x + 22, b - 66, 158, 5);
    ctx.fillStyle = d;
    for (let i = 0; i < 9; i++) ctx.fillRect(x + 36 + i * 15.6 + 10.5, b - 56, 4.2, 54); // gaps between the 8 columns
    ctx.beginPath(); ctx.moveTo(x + 40, b - 70); ctx.lineTo(x + 162, b - 70); ctx.lineTo(x + 101, b - 86); ctx.closePath(); ctx.globalAlpha = 0.5; ctx.fill(); ctx.globalAlpha = 1;
    ctx.fillRect(cx - 4, b - 108, 8, 5);                    // oculus hint
    ctx.fillRect(cx + 14, b - 62, 4, 12); ctx.fillRect(cx + 30, b - 62, 4, 12);
  }
  function castel(ctx, x, b, f, d) { // Castel Sant'Angelo + the bridge with its angel
    const cx = x + 96;
    ctx.fillStyle = f;
    ctx.fillRect(x + 14, b - 36, 164, 36);                  // square bastion
    for (let i = 0; i < 12; i++) ctx.fillRect(x + 14 + i * 14, b - 42, 8, 6);
    ctx.fillRect(cx - 46, b - 98, 92, 64);                  // drum
    for (let i = 0; i < 8; i++) ctx.fillRect(cx - 46 + i * 12.4, b - 104, 7, 6);
    ctx.fillRect(cx - 28, b - 126, 56, 30);                 // upper drum
    for (let i = 0; i < 5; i++) ctx.fillRect(cx - 28 + i * 12.6, b - 132, 7, 6);
    ctx.fillRect(cx - 12, b - 146, 24, 22);                 // lantern
    ctx.fillRect(cx - 1.5, b - 170, 3, 26);                 // the angel on top
    ctx.beginPath(); ctx.moveTo(cx, b - 168); ctx.lineTo(cx - 12, b - 176); ctx.lineTo(cx - 3, b - 160); ctx.lineTo(cx + 3, b - 160); ctx.lineTo(cx + 12, b - 176); ctx.closePath(); ctx.fill();
    ctx.fillRect(x + 196, b - 26, 200, 12);                 // bridge deck
    for (let i = 0; i < 4; i++) { ctx.fillRect(x + 200 + i * 48, b - 56, 4, 30); ctx.beginPath(); ctx.arc(x + 214 + i * 48, b - 58, 5, 0, 7); ctx.fill(); } // statues on the parapet
    ctx.fillStyle = d;
    for (let i = 0; i < 4; i++) ctx.fillRect(cx - 38 + i * 24, b - 84, 6, 20);
    for (let i = 0; i < 3; i++) ctx.fillRect(cx - 18 + i * 14, b - 118, 5, 14);
    for (let i = 0; i < 5; i++) { ctx.beginPath(); ctx.arc(x + 232 + i * 38, b - 14, 15, Math.PI, 0); ctx.fill(); } // bridge arches
  }
  function vittoriano(ctx, x, b, f, d) { // Altare della Patria: stairs, colonnade, side pavilions with quadrigas
    ctx.fillStyle = f;
    ctx.fillRect(x, b - 12, 250, 12); ctx.fillRect(x + 18, b - 24, 214, 12); ctx.fillRect(x + 38, b - 36, 174, 12);
    ctx.fillRect(x + 34, b - 88, 182, 52);                  // colonnade
    ctx.fillRect(x + 30, b - 94, 190, 8);
    [x + 4, x + 192].forEach((px) => {
      ctx.fillRect(px, b - 112, 54, 78); ctx.fillRect(px - 3, b - 118, 60, 7);
      ctx.fillRect(px + 8, b - 134, 38, 16);                // quadriga
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.arc(px + 12 + i * 9, b - 138, 5, Math.PI, 0); ctx.fill(); }
      ctx.fillRect(px + 22, b - 150, 10, 12);               // winged victory
      ctx.beginPath(); ctx.moveTo(px + 27, b - 148); ctx.lineTo(px + 14, b - 158); ctx.lineTo(px + 22, b - 142); ctx.lineTo(px + 32, b - 142); ctx.lineTo(px + 40, b - 158); ctx.closePath(); ctx.fill();
    });
    ctx.fillRect(x + 96, b - 108, 58, 24);                  // central terrace with the equestrian statue
    ctx.fillRect(x + 112, b - 128, 26, 20); ctx.fillRect(x + 108, b - 134, 34, 8);
    ctx.fillStyle = d;
    for (let i = 0; i < 12; i++) ctx.fillRect(x + 40 + i * 14.4 + 8, b - 80, 5, 38);
    [x + 4, x + 192].forEach((px) => { for (let i = 0; i < 4; i++) ctx.fillRect(px + 7 + i * 12, b - 104, 5, 36); });
  }
  function trajan(ctx, x, b, f, d) { // Colonna Traiana
    ctx.fillStyle = f;
    ctx.fillRect(x + 2, b - 24, 26, 24); ctx.fillRect(x + 7, b - 126, 16, 102); ctx.fillRect(x + 4, b - 132, 22, 7);
    ctx.fillRect(x + 13, b - 152, 4, 20); ctx.beginPath(); ctx.arc(x + 15, b - 154, 4, 0, 7); ctx.fill();
    ctx.strokeStyle = d; ctx.lineWidth = 2;
    for (let i = 0; i < 9; i++) { ctx.beginPath(); ctx.moveTo(x + 7, b - 40 - i * 10); ctx.lineTo(x + 23, b - 46 - i * 10); ctx.stroke(); }
  }
  /** A run of Roman rooftops: ochre blocks with windows, a bell tower or two and a few cypresses. */
  function rooftops(seed) {
    return (ctx, x, b, f, d) => {
      let cx = x;
      const end = x + (seed === 6 ? 380 : seed === 1 ? 160 : 130);
      let i = 0;
      while (cx < end) {
        const w = 26 + hash(seed * 31 + i) * 22, h = 38 + hash(seed * 17 + i * 3) * 38;
        ctx.fillStyle = f; ctx.fillRect(cx, b - h, w, h);
        if (hash(seed + i * 7) > 0.72) { ctx.fillRect(cx + w / 2 - 5, b - h - 34, 10, 34); ctx.beginPath(); ctx.moveTo(cx + w / 2 - 7, b - h - 34); ctx.lineTo(cx + w / 2, b - h - 46); ctx.lineTo(cx + w / 2 + 7, b - h - 34); ctx.fill(); } // campanile
        else if (hash(seed + i * 5) > 0.82) { ctx.beginPath(); ctx.arc(cx + w / 2, b - h, w * 0.4, Math.PI, 0); ctx.fill(); }                                              // little church dome
        ctx.fillStyle = d;
        for (let r = 0; r < Math.floor(h / 18); r++) for (let c = 0; c < Math.floor(w / 13); c++) ctx.fillRect(cx + 4 + c * 11, b - h + 8 + r * 16, 5, 8);
        cx += w + 1; i++;
      }
      if (seed === 6 || seed === 3) { ctx.fillStyle = f; [x + 20, x + 46].forEach((px, k) => { ctx.beginPath(); ctx.ellipse(px, b - 52 - k * 8, 8, 52 + k * 8, 0, 0, 7); ctx.fill(); }); }
    };
  }

  class Renderer {
    constructor(canvas) {
      this.canvas = canvas;
      this.ctx = canvas.getContext('2d');
      this.scale = 1;
      this.stars = Array.from({ length: 70 }, (_, i) => ({ x: hash(i) * C.W, y: hash(i + 99) * (GY - 120), r: 0.8 + hash(i + 7) * 1.4, ph: hash(i + 3) * 6 }));
      this.fontsReady = false;
    }

    resize(cssW, cssH) {
      const dpr = Math.min(window.devicePixelRatio || 1, 2.5);
      this.canvas.width = Math.round(cssW * dpr);
      this.canvas.height = Math.round(cssH * dpr);
      this.scale = (cssW * dpr) / C.W;
    }

    // ================================================================= frame
    render(w, fx, time) {
      const ctx = this.ctx;
      ctx.setTransform(this.scale, 0, 0, this.scale, 0, 0);
      ctx.lineCap = 'round'; ctx.lineJoin = 'round';
      const pal = paletteAt(w.distance);
      this.pal = pal;

      this.background(w, pal, time);

      ctx.save();
      if (fx.shake > 0.2) ctx.translate(U.rand(-fx.shake, fx.shake), U.rand(-fx.shake, fx.shake));

      this.ground(w, pal, time);
      this.platforms(w);
      this.shadows(w);
      this.obstacles(w, time);
      this.collectibles(w, time);
      this.enemies(w, time);
      this.shots(w, time);
      this.player(w, time);
      this.meteors(w, time);
      this.waterOverlay(w, pal, time);
      this.particles(fx);
      this.bubbles(fx);
      this.texts(fx);
      this.speedLines(w, time);
      ctx.restore();

      this.bombOverlay(w, time);
      if (fx.flash > 0.01) { ctx.globalAlpha = Math.min(1, fx.flash); ctx.fillStyle = fx.flashColor; ctx.fillRect(0, 0, C.W, C.H); ctx.globalAlpha = 1; }
      if (w.hearts === 1 && !w.player.dead) this.lowHealth(time);
    }

    // ================================================================= background
    background(w, pal, time) {
      const ctx = this.ctx, d = w.distance;
      const g = ctx.createLinearGradient(0, 0, 0, GY);
      g.addColorStop(0, pal.top); g.addColorStop(1, pal.bot);
      ctx.fillStyle = g; ctx.fillRect(0, 0, C.W, C.H);

      // stars
      if (pal.star > 0.02) {
        ctx.fillStyle = '#fff';
        for (const s of this.stars) { ctx.globalAlpha = pal.star * (0.5 + 0.5 * Math.sin(time * 2 + s.ph)); ctx.beginPath(); ctx.arc(s.x, s.y, s.r, 0, 7); ctx.fill(); }
        ctx.globalAlpha = 1;
      }
      // sun / moon
      const sy = 120 + 20 * Math.sin(d / 5000);
      ctx.fillStyle = pal.sun; ctx.globalAlpha = 0.25; ctx.beginPath(); ctx.arc(770, sy, 78, 0, 7); ctx.fill();
      ctx.globalAlpha = 1; ctx.beginPath(); ctx.arc(770, sy, 50, 0, 7); ctx.fill();
      if (pal.star > 0.9) { ctx.fillStyle = 'rgba(0,0,0,0.07)'; [[756, sy - 10, 9], [782, sy + 12, 6], [768, sy + 20, 4]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); }); }

      // clouds
      ctx.fillStyle = pal.cloud; ctx.globalAlpha = 0.85;
      for (let i = 0; i < 6; i++) {
        const cx = ((i * 260 + 40 - d * 0.07 - time * 6) % (C.W + 320) + (C.W + 320)) % (C.W + 320) - 160;
        const cy = 60 + (i % 3) * 52 + hash(i) * 30, sc = 0.8 + hash(i + 5) * 0.7;
        ctx.beginPath(); ctx.arc(cx, cy, 20 * sc, 0, 7); ctx.arc(cx + 26 * sc, cy - 10 * sc, 26 * sc, 0, 7); ctx.arc(cx + 58 * sc, cy, 20 * sc, 0, 7); ctx.rect(cx, cy, 58 * sc, 20 * sc); ctx.fill();
      }
      ctx.globalAlpha = 1;

      this.farLayer(d * 0.16, pal);
      this.hills(d * 0.34, pal.mid, 62, 0.006, 0);
      this.pines(d * 0.5, pal.near);
      this.hills(d * 0.6, pal.near, 28, 0.011, 2);
    }

    /**
     * The Rome skyline: Colosseo, Altare della Patria, Colonna Traiana, Pantheon, Castel Sant'Angelo with its bridge,
     * and the dome of San Pietro, with rows of rooftops in between. Flat silhouette colour + a darker tone for openings.
     */
    farLayer(off, pal) {
      const ctx = this.ctx, TW = 2800, b = GY - 8;
      const t0 = Math.floor(off / TW);
      const f = pal.far, d = pal.mid;
      for (let t = t0; t <= t0 + 1; t++) {
        const bx = t * TW - off;
        if (bx > C.W + 60 || bx + TW < -60) continue;
        const at = (x, fn, w) => { if (bx + x < C.W + 40 && bx + x + w > -40) fn(ctx, bx + x, b, f, d); };
        at(0, rooftops(1), 170);
        at(170, colosseum, 360);
        at(560, rooftops(2), 150);
        at(722, trajan, 30);
        at(770, vittoriano, 250);
        at(1040, rooftops(3), 140);
        at(1190, pantheon, 220);
        at(1440, rooftops(4), 150);
        at(1610, castel, 400);
        at(2020, rooftops(5), 110);
        at(2140, peters, 260);
        at(2410, rooftops(6), 390);
      }
    }
    hills(off, color, amp, freq, seed) {
      const ctx = this.ctx;
      ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(0, GY);
      for (let x = 0; x <= C.W + 20; x += 16) {
        const wx = x + off;
        ctx.lineTo(x, GY - 26 - amp * (0.55 + 0.45 * Math.sin(wx * freq + seed)) - amp * 0.35 * Math.sin(wx * freq * 2.7 + seed * 3));
      }
      ctx.lineTo(C.W + 20, GY); ctx.closePath(); ctx.fill();
    }
    pines(off, color) { // umbrella pines
      const ctx = this.ctx, sp = 430;
      const i0 = Math.floor(off / sp);
      ctx.fillStyle = color; ctx.strokeStyle = color;
      for (let i = i0 - 1; i <= i0 + Math.ceil(C.W / sp) + 1; i++) {
        const x = i * sp - off + hash(i) * 160, h = 70 + hash(i + 4) * 50;
        ctx.lineWidth = 6; ctx.beginPath(); ctx.moveTo(x, GY - 10); ctx.quadraticCurveTo(x + 6, GY - h * 0.6, x + 2, GY - h); ctx.stroke();
        ctx.beginPath(); ctx.ellipse(x + 2, GY - h - 4, 38, 13, 0, 0, 7); ctx.ellipse(x - 16, GY - h + 2, 22, 9, 0, 0, 7); ctx.ellipse(x + 22, GY - h + 1, 22, 9, 0, 0, 7); ctx.fill();
      }
    }

    /** Water passages: the road is replaced by a pool with an animated surface. */
    water(w, pal, time) {
      const ctx = this.ctx, top = GY - 12;
      for (const z of w.water) {
        if (z.x > C.W + 20 || z.x + z.w < -20) continue;
        const x0 = Math.max(-10, z.x), x1 = Math.min(C.W + 10, z.x + z.w);
        const g = ctx.createLinearGradient(0, top, 0, C.H);
        g.addColorStop(0, pal.waterL); g.addColorStop(0.18, pal.water); g.addColorStop(1, pal.gr);
        ctx.fillStyle = g;
        ctx.beginPath(); ctx.moveTo(x0, C.H);
        for (let x = x0; x <= x1; x += 8) ctx.lineTo(x, top + Math.sin((x + z.x) * 0.06 + time * 3) * 2.4 + Math.sin((x + z.x) * 0.13 - time * 4) * 1.2);
        ctx.lineTo(x1, C.H); ctx.closePath(); ctx.fill();
        // foam on the surface + drifting light streaks
        ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2.4; ctx.beginPath();
        for (let x = x0; x <= x1; x += 8) { const y = top + Math.sin((x + z.x) * 0.06 + time * 3) * 2.4 + Math.sin((x + z.x) * 0.13 - time * 4) * 1.2; x === x0 ? ctx.moveTo(x, y) : ctx.lineTo(x, y); }
        ctx.stroke();
        ctx.fillStyle = 'rgba(255,255,255,0.18)';
        for (let i = 0; i < Math.floor(z.w / 90); i++) { const px = z.x + 30 + i * 90 + hash(i * 3 + 1) * 40; if (px > x0 && px < x1) ctx.fillRect(px, GY + 14 + (i % 4) * 16, 34, 3); }
        // edges of the pool
        ctx.fillStyle = pal.gl; if (z.x > -10 && z.x < C.W) ctx.fillRect(z.x - 5, GY - 4, 6, 12); if (z.x + z.w > 0 && z.x + z.w < C.W) ctx.fillRect(z.x + z.w - 1, GY - 4, 6, 12);
      }
    }
    /** Translucent water over whatever is submerged (lower body of the swimmer, buoys' bases, coins low in the water). */
    waterOverlay(w, pal, time) {
      if (!w.water.length) return;
      const ctx = this.ctx, top = GY - 12;
      ctx.save(); ctx.globalAlpha = 0.42; ctx.fillStyle = pal.water;
      for (const z of w.water) {
        if (z.x > C.W || z.x + z.w < 0) continue;
        const x0 = Math.max(0, z.x), x1 = Math.min(C.W, z.x + z.w);
        ctx.fillRect(x0, top + 2, x1 - x0, C.H - top);
      }
      ctx.restore();
    }

    ground(w, pal, time) {
      const ctx = this.ctx, d = w.distance;
      ctx.fillStyle = pal.gr; ctx.fillRect(0, GY, C.W, C.H - GY);
      ctx.fillStyle = pal.gl; ctx.fillRect(0, GY, C.W, 7);
      ctx.fillStyle = 'rgba(0,0,0,0.18)'; ctx.fillRect(0, GY + 7, C.W, 3);
      // lane dashes + pebbles scroll at full speed so the speed is felt
      ctx.fillStyle = pal.gl;
      const dash = 70, gap = 70, per = dash + gap, o = d % per;
      for (let x = -o; x < C.W; x += per) ctx.fillRect(x, GY + 38, dash, 5);
      ctx.fillStyle = 'rgba(255,255,255,0.08)';
      const per2 = 110, o2 = (d * 1.0) % per2;
      for (let x = -o2; x < C.W; x += per2) { ctx.fillRect(x + 20, GY + 62, 26, 4); ctx.fillRect(x + 70, GY + 78, 14, 3); }
      this.water(w, pal, time);
      this.ice(w, pal, time);
    }

    /**
     * "Tavola d'acqua" (Sensei): the road turns into a glossy ice rink with skate trails and sparkles, rink boards at both
     * ends and a signpost at the entrance.
     */
    ice(w, pal, time) {
      if (!w.ice.length) return;
      const ctx = this.ctx, top = GY;
      const night = pal.star;
      for (const z of w.ice) {
        if (z.x > C.W + 200 || z.x + z.w < -20) continue;
        const x0 = Math.max(-10, z.x), x1 = Math.min(C.W + 10, z.x + z.w);
        const g = ctx.createLinearGradient(0, top, 0, C.H);
        g.addColorStop(0, night > 0.5 ? '#8fb8e8' : '#e6f8ff'); g.addColorStop(0.35, night > 0.5 ? '#5f8fd0' : '#aee2f6'); g.addColorStop(1, night > 0.5 ? '#2c4a8c' : '#6fc0e6');
        ctx.fillStyle = g; ctx.fillRect(x0, top, x1 - x0, C.H - top);
        // bright top edge
        ctx.fillStyle = 'rgba(255,255,255,0.9)'; ctx.fillRect(x0, top, x1 - x0, 3);
        ctx.fillStyle = 'rgba(40,120,180,0.25)'; ctx.fillRect(x0, top + 3, x1 - x0, 3);
        // skate trails (long curved scratches that scroll with the rink) and drifting glints
        ctx.strokeStyle = 'rgba(255,255,255,0.7)'; ctx.lineWidth = 1.6;
        for (let i = 0; i < Math.floor(z.w / 120); i++) {
          const px = z.x + 40 + i * 120 + hash(i * 5 + 2) * 50, py = GY + 16 + (i % 4) * 17;
          if (px > x1 || px + 90 < x0) continue;
          ctx.beginPath(); ctx.moveTo(px, py); ctx.quadraticCurveTo(px + 40, py - 5 + hash(i) * 10, px + 92, py + 2); ctx.stroke();
        }
        ctx.strokeStyle = 'rgba(40,120,180,0.28)'; ctx.lineWidth = 1.2;
        for (let i = 0; i < Math.floor(z.w / 150); i++) {
          const px = z.x + 90 + i * 150 + hash(i * 9 + 4) * 60, py = GY + 24 + (i % 3) * 20;
          if (px > x1 || px + 120 < x0) continue;
          ctx.beginPath(); ctx.moveTo(px, py + 4); ctx.quadraticCurveTo(px + 60, py - 8, px + 124, py + 3); ctx.stroke();
        }
        for (let i = 0; i < Math.floor(z.w / 70); i++) {
          const px = z.x + 20 + i * 70 + hash(i * 7 + 1) * 40;
          if (px < x0 || px > x1) continue;
          const k = 0.5 + 0.5 * Math.sin(time * 4 + i * 1.7);
          ctx.fillStyle = `rgba(255,255,255,${0.25 + 0.6 * k})`;
          Art.star(ctx, px, GY + 14 + ((i * 37) % 70), 2 + 2.2 * k, 0); ctx.fill();
        }
        // rink boards at both ends
        ctx.fillStyle = '#f4f9ff'; ctx.strokeStyle = Art.OUT; ctx.lineWidth = 2;
        [z.x - 6, z.x + z.w - 2].forEach((bx) => { if (bx > -20 && bx < C.W + 10) { Art.rr(ctx, bx, GY - 14, 8, 26, 3); ctx.fill(); ctx.stroke(); } });
        // the signpost at the entrance
        if (z.x > -160 && z.x < C.W + 80) {
          ctx.save(); ctx.translate(z.x - 26, GY + 4);
          ctx.fillStyle = '#7a4a2a'; ctx.strokeStyle = Art.OUT; ctx.lineWidth = 2.4;
          ctx.fillRect(-3, -62, 6, 62); ctx.strokeRect(-3, -62, 6, 62);
          Art.rr(ctx, -74, -98, 148, 40, 8); ctx.fillStyle = '#1f6fd6'; ctx.fill(); ctx.stroke();
          Art.rr(ctx, -69, -93, 138, 30, 5); ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.6; ctx.stroke();
          ctx.fillStyle = '#fff'; ctx.font = '700 16px Bungee, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
          ctx.fillText("TAVOLA D'ACQUA", 0, -78);
          ctx.textBaseline = 'alphabetic';
          ctx.restore();
        }
      }
    }

    platforms(w) {
      const ctx = this.ctx;
      for (const p of w.platforms) { ctx.save(); ctx.translate(p.x, p.y); Art.platform(ctx, p.w); ctx.restore(); }
    }

    shadows(w) {
      const ctx = this.ctx;
      const sh = (x, y, rw) => {
        const h = Math.max(0, GY - y), k = 1 / (1 + h / 160);
        ctx.fillStyle = `rgba(0,0,0,${0.28 * k})`; ctx.beginPath(); ctx.ellipse(x, GY + 4, rw * k, 4.5 * k, 0, 0, 7); ctx.fill();
      };
      const p = w.player;
      if (!p.dead && !p.swim) sh(p.x, p.plat ? GY : p.y, w.power.type === 'bike' ? (w.charId === 'sensei' ? 50 : 40) : 18);
      for (const e of w.enemies) if (!e.dead) sh(e.x, e.y, e.kind === 'oldman' || e.kind === 'hall' ? 26 : e.kind === 'chip' ? 12 : 18);
    }

    obstacles(w, time) {
      const ctx = this.ctx;
      for (const o of w.obstacles) {
        ctx.save(); ctx.translate(o.x + o.w / 2, o.y);
        if (o.kind === 'cone') Art.cone(ctx); else if (o.kind === 'buoy') Art.buoy(ctx, time + o.x * 0.01); else if (o.kind === 'wing') Art.wingProfile(ctx, time + o.x * 0.01); else Art.books(ctx);
        ctx.restore();
      }
    }

    collectibles(w, time) {
      const ctx = this.ctx;
      for (const c of w.coins) {
        ctx.save(); ctx.translate(c.x, c.y + Math.sin(time * 3 + c.x * 0.02) * 2);
        (c.kind === 'note' ? Art.note : Art.coin)(ctx, time + c.x * 0.01); ctx.restore();
      }
      for (const it of w.items) {
        const bob = Math.sin(time * 3 + it.ph) * 4;
        ctx.save(); ctx.translate(it.x, it.y + bob);
        const halo = ((w.charId === 'sensei' && { bike: '255,158,196', sword: '217,160,91', shield: '230,57,70' }) || {})[it.kind]
          || { paper: '90,140,255', bomb: '255,90,90', heart: '255,100,140', bike: '244,162,97', skis: '76,201,240', sword: '255,209,102', shield: '240,180,41', pencil: '255,143,184' }[it.kind];
        const rg = ctx.createRadialGradient(0, 0, 4, 0, 0, 34);
        rg.addColorStop(0, `rgba(${halo},0.42)`); rg.addColorStop(1, `rgba(${halo},0)`);
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, 0, 34, 0, 7); ctx.fill();
        if (it.kind === 'paper') { ctx.rotate(Math.sin(time * 2 + it.ph) * 0.15); Art.paper(ctx, time, 1.25); }
        else if (it.kind === 'bomb') Art.bombItem(ctx, time);
        else if (it.kind === 'heart') Art.heart(ctx, time, 1.1);
        else Art.powerBadge(ctx, it.kind, time, w.charId);
        ctx.restore();
      }
    }

    // ================================================================= enemies
    enemies(w, time) {
      const ctx = this.ctx;
      for (const e of w.enemies) {
        ctx.save();
        ctx.translate(e.x, e.y);
        if (e.flash > 0) ctx.filter = 'brightness(2.4)';
        if (e.dead) { ctx.translate(0, -e.h / 2); ctx.rotate(e.rot); ctx.translate(0, e.h / 2); ctx.globalAlpha = U.clamp(1.5 - e.deadT, 0, 1); }
        if (e.kind === 'oldman') {
          ctx.scale(-1, 1);
          Art.oldman(ctx, { t: time + e.x * 0.01, state: e.state });
        } else if (e.kind === 'hall') {
          ctx.scale(-1, 1);
          Art.hall(ctx, { t: time + e.x * 0.01, state: e.state });
        } else if (e.kind === 'chip') {
          ctx.scale(-1, 1);
          Art.chip(ctx, { t: time + (e.who === 'ciop' ? 0.2 : 0), state: e.state, who: e.who, hiss: e.flash > 0 });
        } else {
          ctx.scale(-1, 1);
          Art.cat(ctx, { t: time, state: e.state, hiss: e.flash > 0 });
        }
        ctx.restore();

        if (e.dead) continue;
        // little hp pips so the player can see progress
        const boss = e.kind === 'oldman' || e.kind === 'hall';   // Francone and Mr. Hall
        if (e.maxHp > 1 && !(boss && e.state === 'enter')) {
          const n = e.maxHp, pw = 9, tw = n * pw + (n - 1) * 3, top = e.y - e.h - (boss ? 22 : 30);
          for (let i = 0; i < n; i++) {
            ctx.fillStyle = i < e.hp ? '#ff4d6d' : 'rgba(0,0,0,0.35)';
            ctx.strokeStyle = Art.OUT; ctx.lineWidth = 1.5;
            Art.rr(ctx, e.x - tw / 2 + i * (pw + 3), top, pw, 6, 2); ctx.fill(); ctx.stroke();
          }
        }
        if (e.kind === 'cat' && e.nameT > 0) this.tag(e.x, e.y - 58, 'FIGARO', Math.min(1, e.nameT));
        if (e.kind === 'chip' && e.nameT > 0) this.tag(e.x, e.y - 46, e.who.toUpperCase(), Math.min(1, e.nameT));
        if (e.kind === 'hall' && e.nameT > 0 && e.state !== 'windup') this.tag(e.x, e.y - e.h - 36, 'MR. HALL', Math.min(1, e.nameT));
        if (boss && e.state === 'windup') {
          const blink = Math.floor(time * 14) % 2, top = e.y - e.h - 68;
          ctx.fillStyle = blink ? '#ff3b3b' : '#ffd166'; ctx.strokeStyle = Art.OUT; ctx.lineWidth = 2.5;
          ctx.beginPath(); ctx.moveTo(e.x - 8, top); ctx.lineTo(e.x + 20, top); ctx.lineTo(e.x + 6, top + 30); ctx.closePath(); ctx.fill(); ctx.stroke();
          ctx.fillStyle = '#1c2033'; ctx.font = '800 17px Bungee, Impact, sans-serif'; ctx.textAlign = 'center'; ctx.fillText('!', e.x + 6, top + 21);
        }
      }
    }
    tag(x, y, str, a) {
      const ctx = this.ctx;
      ctx.save(); ctx.globalAlpha = a; ctx.font = '700 13px Fredoka, system-ui, sans-serif'; ctx.textAlign = 'center';
      const tw = ctx.measureText(str).width + 14;
      ctx.fillStyle = '#fff'; ctx.strokeStyle = Art.OUT; ctx.lineWidth = 2; Art.rr(ctx, x - tw / 2, y - 14, tw, 20, 8); ctx.fill(); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(x - 5, y + 6); ctx.lineTo(x, y + 12); ctx.lineTo(x + 5, y + 6); ctx.fillStyle = '#fff'; ctx.fill();
      ctx.fillStyle = Art.OUT; ctx.fillText(str, x, y + 1); ctx.restore();
    }

    shots(w, time) {
      const ctx = this.ctx;
      for (const s of w.shots) {
        ctx.strokeStyle = 'rgba(255,255,255,0.5)'; ctx.lineWidth = 2;
        for (let i = 0; i < 3; i++) { ctx.beginPath(); ctx.moveTo(s.x - 18 - i * 6, s.y - 6 + i * 6); ctx.lineTo(s.x - 34 - i * 8, s.y - 6 + i * 6); ctx.stroke(); }
        ctx.save(); ctx.translate(s.x, s.y); ctx.rotate(s.rot); Art.paper(ctx, time, 1.3); ctx.restore();
      }
    }

    // ================================================================= RSE meteorites
    meteors(w, time) {
      const ctx = this.ctx;
      for (const m of w.meteors) {
        if (m.state === 'fall') {
          // target on the road: a red reticle that closes in as the rock gets nearer
          const left = U.clamp(1 - m.t / m.T, 0, 1), pulse = 0.5 + 0.5 * Math.sin(time * 18);
          ctx.save(); ctx.translate(m.tx, GY + 9);
          ctx.fillStyle = `rgba(255,40,50,${0.16 + 0.3 * (1 - left) + 0.1 * pulse})`;
          ctx.beginPath(); ctx.ellipse(0, 0, 50, 10, 0, 0, 7); ctx.fill();
          ctx.strokeStyle = `rgba(255,80,80,${0.55 + 0.4 * pulse})`; ctx.lineWidth = 3; ctx.setLineDash([10, 7]); ctx.lineDashOffset = -time * 30;
          ctx.beginPath(); ctx.ellipse(0, 0, 50 + 38 * left, 10 + 7 * left, 0, 0, 7); ctx.stroke(); ctx.setLineDash([]);
          ctx.beginPath(); ctx.moveTo(-60, 0); ctx.lineTo(-38, 0); ctx.moveTo(38, 0); ctx.lineTo(60, 0); ctx.strokeStyle = '#ff5c6c'; ctx.lineWidth = 3; ctx.stroke();
          ctx.restore();
          // the rock with its flame tail
          ctx.save(); ctx.translate(m.x, m.y);
          ctx.save(); ctx.rotate(Math.atan2(m.vy, m.vx)); Art.meteorTrail(ctx, time + m.x * 0.01); ctx.restore();
          ctx.rotate(Math.sin(time * 4 + m.spin) * 0.14);
          Art.meteor(ctx, time);
          ctx.restore();
        } else {
          // fireball + shockwave on the spot where it burst
          const k = U.clamp(m.boomT / 0.5, 0, 1), r = 20 + 74 * Math.sqrt(k);
          ctx.save(); ctx.translate(m.x, m.by);
          const g = ctx.createRadialGradient(0, 0, r * 0.1, 0, 0, r);
          g.addColorStop(0, `rgba(255,250,210,${1 - k})`); g.addColorStop(0.45, `rgba(255,170,50,${0.9 * (1 - k)})`); g.addColorStop(1, 'rgba(255,70,30,0)');
          ctx.fillStyle = g; ctx.beginPath(); ctx.arc(0, 0, r, 0, 7); ctx.fill();
          ctx.strokeStyle = `rgba(255,255,255,${0.8 * (1 - k)})`; ctx.lineWidth = 5 * (1 - k) + 1; ctx.beginPath(); ctx.ellipse(0, 14, r * 1.5, r * 0.28, 0, 0, 7); ctx.stroke();
          ctx.restore();
        }
      }
    }

    // ================================================================= player
    player(w, time) {
      const ctx = this.ctx, p = w.player, type = w.power.type;
      const sen = w.charId === 'sensei';
      let showName = false; // the little girl's name tag, for the first seconds of the passeggino
      ctx.save();
      ctx.translate(p.x, p.y);
      if (p.invuln > 0 && !p.dead && !(type === 'bike' || type === 'sword' || type === 'shield') && Math.floor(time * 20) % 2) ctx.globalAlpha = 0.35;
      // power-up warning blink
      if (type && w.power.t < 1.6 && Math.floor(time * 12) % 2) ctx.globalAlpha = Math.min(ctx.globalAlpha, 0.55);

      // golden sword aura
      if (type === 'sword') {
        const rg = ctx.createRadialGradient(0, -34, 8, 0, -34, 66);
        rg.addColorStop(0, 'rgba(255,214,102,0.55)'); rg.addColorStop(1, 'rgba(255,214,102,0)');
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, -34, 66, 0, 7); ctx.fill();
        // slash arc in front
        const a = (time * 7) % (Math.PI * 2);
        ctx.strokeStyle = `rgba(255,246,194,${0.35 + 0.25 * Math.sin(time * 14)})`; ctx.lineWidth = 5;
        ctx.beginPath(); ctx.arc(34, -38, 52, -1.2 + Math.sin(a) * 0.15, 0.6 + Math.sin(a) * 0.15); ctx.stroke();
      }
      ctx.save();
      if (p.dead) { ctx.translate(0, -26); ctx.rotate(p.deadT * 7); ctx.translate(0, 26); }

      const expr = p.dead ? 'dead' : p.hurtT > 0 ? 'hurt' : p.bombT > 0 ? 'shout' : p.collectT > 0 ? 'happy' : type === 'sword' || type === 'skis' ? 'focus' : 'normal';
      const throwP = p.throwT > 0 ? 1 - p.throwT / 0.26 : -1;
      const raise = p.bombT > 0 || p.collectT > 0.4 ? 1 : 0;
      const blink = (time % 3.4) < 0.12;

      if (type === 'bike') {
        const tilt = p.onGround ? 0 : U.clamp(-p.vy / 1500, -0.3, 0.3) * -1;
        ctx.translate(-27, 0); ctx.rotate(p.onGround ? 0 : -U.clamp(-p.vy / 2200, -0.2, 0.28)); ctx.translate(27, 0);
        const bexpr = p.dead ? 'dead' : p.hurtT > 0 ? 'hurt' : 'happy';
        if (sen) { ctx.translate(12, 0); ctx.scale(0.95, 0.95); Art.stroller(ctx, { t: time, expr: bexpr, throwP, raise }); showName = w.power.dur - w.power.t < 3; } // the passeggino
        else Art.bike(ctx, { t: time, expr: bexpr, throwP, raise });
      } else {
        ctx.scale(1.15, 1.15); // the hero is drawn a touch larger than its hitbox so he always reads clearly
        // costume change: the old outfit is shown for the first half of the puff, the new one for the second
        const swimLook = !sen && (p.changeT > 0.2 ? !p.swim : p.swim);
        if (sen) {
          Art.sensei(ctx, { t: p.animT, mode: type === 'skis' ? 'skis' : type === 'sword' ? 'staff' : 'run', air: !p.onGround, vy: p.vy, expr, blink, throwP, raise, pencil: type === 'pencil', runRate: 11 + w.scroll / 70, skate: p.changeT > 0.2 ? !p.skate : p.skate });
        } else if (swimLook) {
          const pitch = U.clamp(p.vy / 1100, -0.5, 0.55);
          ctx.translate(0, -14); ctx.rotate(pitch); ctx.translate(0, 14);
          Art.heroSwim(ctx, { t: p.animT, expr: expr === 'focus' ? 'normal' : expr, throwP });
          if (type === 'sword') { ctx.save(); ctx.translate(32, -22); ctx.rotate(-0.2 + Math.sin(time * 9) * 0.15); Art.sword(ctx, 44, 1, time); ctx.restore(); }
        } else {
          Art.hero(ctx, { t: p.animT, mode: type === 'skis' ? 'skis' : type === 'sword' ? 'sword' : 'run', air: !p.onGround, vy: p.vy, expr, blink, throwP, raise, pencil: type === 'pencil', runRate: 11 + w.scroll / 70 });
        }
      }
      ctx.restore();

      // Scudetto: a giallorosso force field with little shields orbiting it
      if (type === 'shield' && !p.dead) {
        const cy = p.swim ? -16 : -34, R = p.swim ? 42 : 52;
        // Scudetto (Tullio) is giallorosso; the Sensei's falce e martello is red and gold
        const col = sen ? { fill: '230,57,70', ring: '#ffd23f', dash: '#b3202d' } : { fill: '247,197,43', ring: '#f0b429', dash: '#a4161a' };
        const rg = ctx.createRadialGradient(0, cy, R * 0.45, 0, cy, R);
        rg.addColorStop(0, `rgba(${col.fill},0.04)`); rg.addColorStop(1, `rgba(${col.fill},0.38)`);
        ctx.fillStyle = rg; ctx.beginPath(); ctx.arc(0, cy, R, 0, 7); ctx.fill();
        ctx.lineWidth = 3; ctx.strokeStyle = col.ring; ctx.beginPath(); ctx.arc(0, cy, R, 0, 7); ctx.stroke();
        ctx.strokeStyle = col.dash; ctx.setLineDash([14, 14]); ctx.lineDashOffset = -time * 40; ctx.beginPath(); ctx.arc(0, cy, R - 4, 0, 7); ctx.stroke(); ctx.setLineDash([]);
        for (let i = 0; i < 3; i++) {
          const a = time * 2.2 + (i * Math.PI * 2) / 3;
          ctx.save(); ctx.translate(Math.cos(a) * R, cy + Math.sin(a) * R * 0.8);
          if (sen) { ctx.scale(0.5, 0.5); ctx.fillStyle = '#e63946'; ctx.strokeStyle = Art.OUT; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(0, 0, 21, 0, 7); ctx.fill(); ctx.stroke(); Art.hammerSickle(ctx); }
          else { ctx.scale(0.42, 0.42); Art.scudetto(ctx); }
          ctx.restore();
        }
      }
      // costume-change puff of smoke
      if (p.changeT > 0 && !p.dead) {
        const k = 1 - p.changeT / 0.4, r = Math.sin(Math.PI * k);
        ctx.fillStyle = 'rgba(255,255,255,0.95)'; ctx.strokeStyle = 'rgba(160,175,200,0.9)'; ctx.lineWidth = 2;
        for (let i = 0; i < 7; i++) {
          const a = i * 0.9 + k * 2, dist = 12 * r;
          ctx.beginPath(); ctx.arc(Math.cos(a) * dist, -28 + Math.sin(a) * dist * 1.3, 8 + 15 * r, 0, 7); ctx.fill(); ctx.stroke();
        }
        ctx.beginPath(); ctx.arc(0, -28, 20 * r + 6, 0, 7); ctx.fill();
      }
      ctx.restore();

      // "Cecilia": the name of the little girl in the passeggino, floating above her for the first seconds
      if (showName && !p.dead) this.tag(p.x + 46, p.y - 90, 'Cecilia', Math.min(1, (3 - (w.power.dur - w.power.t)) * 2));

      // armed bomb floating above the head
      if (w.bombFuse > 0) {
        const k = 1 + (1 - w.bombFuse / C.BOMB_FUSE) * 0.8;
        ctx.save(); ctx.translate(p.x + 6, p.y - 98); ctx.scale(k, k); ctx.rotate(Math.sin(time * 40) * 0.15); Art.bombItem(ctx, time * 3); ctx.restore();
      }
    }

    // ================================================================= fx
    particles(fx) {
      const ctx = this.ctx;
      for (const p of fx.parts) {
        const a = U.clamp(p.life / p.max, 0, 1);
        ctx.globalAlpha = p.shape === 'ring' ? a : Math.min(1, a * 1.6);
        ctx.fillStyle = p.color; ctx.strokeStyle = p.color;
        switch (p.shape) {
          case 'sq': ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.fillRect(-p.size / 2, -p.size / 2, p.size, p.size); ctx.restore(); break;
          case 'feather': ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.beginPath(); ctx.ellipse(0, 0, p.size, p.size * 0.35, 0, 0, 7); ctx.fill(); ctx.restore(); break;
          case 'paper': ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); Art.paper(ctx, 0, 0.7 * (p.size / 8)); ctx.restore(); break;
          case 'star': ctx.save(); Art.star(ctx, p.x, p.y, p.size, p.rot); ctx.fill(); ctx.restore(); break;
          case 'ring': ctx.lineWidth = 4 * a + 1; ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.stroke(); break;
          case 'line': ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(p.x, p.y); ctx.lineTo(p.x - p.vx * 0.06, p.y - p.vy * 0.06); ctx.stroke(); break;
          case 'smoke': ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.fill(); break;
          case 'glasses': ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.lineWidth = 2; ctx.strokeStyle = Art.OUT; ctx.fillStyle = '#0f1018'; ctx.beginPath(); ctx.arc(-6.5, 0, 5.5, 0, 7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.arc(6.5, 0, 5.5, 0, 7); ctx.fill(); ctx.stroke(); ctx.beginPath(); ctx.moveTo(-1, -1); ctx.lineTo(1, -1); ctx.stroke(); ctx.restore(); break;
          case 'chip': ctx.save(); ctx.translate(p.x, p.y); ctx.rotate(p.rot); ctx.beginPath(); ctx.moveTo(-p.size, -p.size * 0.4); ctx.lineTo(p.size, 0); ctx.lineTo(-p.size, p.size * 0.4); ctx.closePath(); ctx.fill(); ctx.restore(); break;
          default: ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, 7); ctx.fill();
        }
      }
      ctx.globalAlpha = 1;
    }
    texts(fx) {
      const ctx = this.ctx;
      ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
      for (const t of fx.texts) {
        const age = 1 - t.life / t.max;
        const k = t.pop ? 1 + Math.max(0, 0.5 - age * 4) : 1;
        ctx.globalAlpha = U.clamp(t.life / (t.max * 0.4), 0, 1);
        ctx.font = `700 ${t.size * k}px Bungee, Fredoka, Impact, sans-serif`;
        ctx.lineWidth = 4; ctx.strokeStyle = Art.OUT; ctx.strokeText(t.str, t.x, t.y);
        ctx.fillStyle = t.color; ctx.fillText(t.str, t.x, t.y);
      }
      ctx.globalAlpha = 1; ctx.textBaseline = 'alphabetic';
    }
    bubbles(fx) {
      const ctx = this.ctx;
      for (const b of fx.bubbles) {
        ctx.save();
        ctx.globalAlpha = U.clamp(b.life / 0.3, 0, 1);
        // shout = Francone yelling: big red capitals in a cream bubble that jolts a little
        const shout = !!b.shout, bh = shout ? 40 : 30;
        ctx.font = shout ? '700 22px Bungee, Impact, "Arial Black", sans-serif' : b.key === 'sensei' ? '700 17px Fredoka, system-ui, sans-serif' : '700 15px Fredoka, system-ui, sans-serif'; ctx.textAlign = 'center';
        const tw = ctx.measureText(b.str).width + (shout ? 30 : 20);
        const jx = shout ? Math.sin(b.life * 70) * 1.6 : 0;
        const x = U.clamp(b.x, tw / 2 + 6, C.W - tw / 2 - 6) + jx, y = b.y;
        ctx.fillStyle = shout ? '#fff7d6' : '#fff'; ctx.strokeStyle = Art.OUT; ctx.lineWidth = shout ? 3 : 2.4;
        Art.rr(ctx, x - tw / 2, y - bh + 6, tw, bh, 12); ctx.fill(); ctx.stroke();
        ctx.beginPath(); ctx.moveTo(b.x - 6, y + 5); ctx.lineTo(b.x - 14, y + 17); ctx.lineTo(b.x + 6, y + 5); ctx.fillStyle = shout ? '#fff7d6' : '#fff'; ctx.fill();
        ctx.beginPath(); ctx.moveTo(b.x - 7, y + 5.5); ctx.lineTo(b.x - 14, y + 17); ctx.lineTo(b.x + 5, y + 5.5); ctx.stroke();
        ctx.fillStyle = shout ? '#d62828' : Art.OUT; ctx.textBaseline = 'alphabetic'; ctx.fillText(b.str, x, shout ? y - 6 : y - 3);
        ctx.restore();
      }
    }
    speedLines(w, time) {
      if (w.speedMul < 1.15) return;
      const ctx = this.ctx, k = U.clamp((w.speedMul - 1.15) * 2, 0, 1);
      ctx.strokeStyle = `rgba(255,255,255,${0.3 * k})`; ctx.lineWidth = 2;
      for (let i = 0; i < 12; i++) {
        const y = 40 + hash(i * 3) * (GY - 60);
        const x = (((hash(i) * C.W - time * 1400 * (0.6 + hash(i + 1))) % (C.W + 200)) + C.W + 200) % (C.W + 200) - 100;
        ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x + 60 + hash(i + 9) * 70, y); ctx.stroke();
      }
    }
    lowHealth(time) {
      const ctx = this.ctx, a = 0.12 + 0.07 * Math.sin(time * 5);
      const g = ctx.createRadialGradient(C.W / 2, C.H / 2, C.H * 0.45, C.W / 2, C.H / 2, C.W * 0.65);
      g.addColorStop(0, 'rgba(255,0,40,0)'); g.addColorStop(1, `rgba(255,0,40,${a * 2.4})`);
      ctx.fillStyle = g; ctx.fillRect(0, 0, C.W, C.H);
    }

    // ================================================================= VA TUTTO MALE
    bombOverlay(w, time) {
      const ctx = this.ctx, p = w.player;
      // tension while the bomb is armed: world dims
      if (w.bombFuse > 0) { ctx.fillStyle = `rgba(20,0,0,${0.35 * (1 - w.bombFuse / C.BOMB_FUSE)})`; ctx.fillRect(0, 0, C.W, C.H); }
      if (w.bombFx <= 0) return;
      const t = 2 - w.bombFx; // 0 → 2 seconds since blast
      const ox = p.x, oy = p.y - 30;
      // dark red tint with radial burst
      const tint = U.clamp(1 - t / 1.5, 0, 1);
      ctx.fillStyle = `rgba(120,0,10,${0.5 * tint})`; ctx.fillRect(0, 0, C.W, C.H);
      ctx.save(); ctx.translate(ox, oy);
      const rays = 22, rot = t * 0.4;
      for (let i = 0; i < rays; i++) {
        const a = rot + (i / rays) * Math.PI * 2, wd = 0.07;
        ctx.fillStyle = i % 2 ? `rgba(255,220,120,${0.55 * tint})` : `rgba(255,90,60,${0.45 * tint})`;
        ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(Math.cos(a - wd) * 1500 * Math.min(1, t * 6), Math.sin(a - wd) * 1500 * Math.min(1, t * 6)); ctx.lineTo(Math.cos(a + wd) * 1500 * Math.min(1, t * 6), Math.sin(a + wd) * 1500 * Math.min(1, t * 6)); ctx.closePath(); ctx.fill();
      }
      // shockwave
      ctx.lineWidth = 26 * (1 - t / 1.1); ctx.strokeStyle = `rgba(255,255,255,${U.clamp(1 - t / 1.1, 0, 1)})`;
      if (t < 1.1) { ctx.beginPath(); ctx.arc(0, 0, t * 1300, 0, 7); ctx.stroke(); }
      ctx.restore();

      // the words
      const text = 'VA TUTTO MALE';
      const inK = U.clamp(t / 0.28, 0, 1), outK = U.clamp((2 - t) / 0.5, 0, 1);
      const back = 1 + 2.7 * Math.pow(inK - 1, 3) + 1.7 * Math.pow(inK - 1, 2); // easeOutBack
      const sc = back * (0.9 + 0.1 * outK);
      ctx.save();
      ctx.translate(C.W / 2 + Math.sin(time * 60) * (t < 0.6 ? 4 : 1), C.H / 2 - 30 + Math.cos(time * 53) * (t < 0.6 ? 4 : 1));
      ctx.rotate(-0.06); ctx.scale(sc, sc); ctx.globalAlpha = outK;
      ctx.font = '900 88px Bungee, Impact, "Arial Black", sans-serif'; ctx.textBaseline = 'middle';
      const widths = [...text].map((ch) => ctx.measureText(ch).width);
      const total = widths.reduce((a, b) => a + b, 0);
      let x = -total / 2;
      [...text].forEach((ch, i) => {
        const dy = Math.sin(time * 16 + i * 0.7) * 6;
        ctx.save(); ctx.translate(x + widths[i] / 2, dy); ctx.rotate(Math.sin(time * 9 + i) * 0.06);
        ctx.lineJoin = 'round'; ctx.lineWidth = 18; ctx.strokeStyle = '#150a14'; ctx.strokeText(ch, 0, 8);
        ctx.lineWidth = 12; ctx.strokeStyle = '#fff'; ctx.strokeText(ch, 0, 0);
        ctx.fillStyle = i % 2 ? '#ff2e4d' : '#ff5c33'; ctx.fillText(ch, 0, 0);
        ctx.restore(); x += widths[i];
      });
      ctx.font = '700 22px Fredoka, system-ui, sans-serif'; ctx.fillStyle = '#fff'; ctx.lineWidth = 5; ctx.strokeStyle = '#150a14'; ctx.lineJoin = 'round';
      ctx.strokeText('(e non è ancora finita…)', 0, 66); ctx.fillText('(e non è ancora finita…)', 0, 66);
      ctx.restore();
      if (t < 0.18) { ctx.fillStyle = `rgba(255,255,255,${1 - t / 0.18})`; ctx.fillRect(0, 0, C.W, C.H); }
    }
  }

  Q.Renderer = Renderer;
})();
