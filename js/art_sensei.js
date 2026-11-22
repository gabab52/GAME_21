/*
 * Art for the Sensei's runs — drawn procedurally like everything in art.js (flat colours + a dark outline), facing +x,
 * y = 0 at the feet. Adds to Q.Art:
 *   sensei    the character himself (run / skis / staff, skating, pushing the stroller)
 *   stroller  the "passeggino" power-up: the Sensei pushing a stroller with a little girl in it
 *   staff     the "bastone" power-up (replaces the sword)
 *   hammerSickle  the "falce e martello" power-up (replaces the scudetto)
 *   wingProfile  obstacle of the "tavola d'acqua" (a drawing of an airfoil)
 *   chip      Cip and Ciop, the two chipmunks that replace Figaro
 *   hall      Mr. Hall, the Sensei's villain: a younger Francone
 * and registers the matching power-up badges in Art.alt.sensei.
 */
(function () {
  const Q = (globalThis.Q = globalThis.Q || {});
  const U = Q.U, Art = Q.Art;
  const { rr, ell, fs, limb, ik, star, OUT } = Art;

  const SK = '#f5c9a6', SK_D = '#e7ac88';
  const ORANGE = '#f7963a', ORANGE_D = '#df7a21';
  const PURPLE = '#6d5bb4', SHOE = '#4b3a8f';
  const SHELL = '#a78bd0', SHELL_L = '#c0a9e2', SHELL_D = '#7d63ad';
  const WHITE = '#fbfbff', WHITE_D = '#d2d6e6';
  const WOOD = '#a8703a', WOOD_L = '#d19852', WOOD_D = '#6e4423';
  const RED = '#d63a3a', LENS = '#2f8a43', LENS_L = '#9be8aa';

  // ------------------------------------------------------------------ head
  /** Bald head, white brows, red-framed green sunglasses, big white moustache and beard. Centre (0,0), facing +x, ~25px tall. */
  function senseiHead(ctx, o) {
    const expr = o.expr || 'normal';
    ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    // ear
    ell(ctx, -9.6, 2.4, 3.3, 5.2); fs(ctx, SK_D, 1.8);
    ctx.strokeStyle = '#c4805f'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.arc(-9.2, 2.4, 1.7, -1.3, 1.5); ctx.stroke();
    // bald head
    ell(ctx, 0, 0, 12.3, 12.6); fs(ctx, SK, 2.2);
    ctx.fillStyle = 'rgba(255,255,255,0.34)'; ell(ctx, -3, -7.6, 5.2, 2.4); ctx.fill();
    ctx.strokeStyle = '#d99677'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-3, -11); ctx.quadraticCurveTo(2, -12.6, 7, -11.2); ctx.stroke();
    // nose (long, pink)
    ell(ctx, 17.6, 4.2, 4.3, 3.7, 0.15); fs(ctx, '#f2b49f', 1.6);
    // beard: a long white point over the chest
    ctx.beginPath();
    ctx.moveTo(1, 8); ctx.bezierCurveTo(0, 17, 4, 27, 10.5, 34); ctx.bezierCurveTo(16, 27, 21, 18, 22, 10); ctx.bezierCurveTo(16, 12.5, 7, 12.5, 1, 8); ctx.closePath();
    fs(ctx, WHITE, 2);
    ctx.strokeStyle = WHITE_D; ctx.lineWidth = 1.2;
    ctx.beginPath(); ctx.moveTo(6, 16); ctx.quadraticCurveTo(7, 24, 10, 30); ctx.moveTo(12, 15); ctx.quadraticCurveTo(13, 23, 11, 30); ctx.moveTo(17, 14); ctx.quadraticCurveTo(17, 19, 14.5, 24); ctx.stroke();
    // mouth (only visible when he yells / is hurt)
    if (expr === 'shout' || expr === 'hurt' || expr === 'dead') { ell(ctx, 16.4, 13.5, 3.6, expr === 'shout' ? 4.6 : 3.4); fs(ctx, '#5a1818', 1.4); }
    // moustache: two heavy lobes sweeping forward and down
    ctx.beginPath(); ctx.moveTo(9, 9); ctx.bezierCurveTo(13, 6.5, 21, 8.5, 25, 15); ctx.bezierCurveTo(27, 20, 22, 23.5, 19.5, 19.5); ctx.bezierCurveTo(16.5, 16, 12, 15, 9, 9); ctx.closePath(); fs(ctx, '#e4e7f2', 1.8);
    ctx.beginPath(); ctx.moveTo(11, 7.5); ctx.bezierCurveTo(16, 4.5, 25, 6.5, 30, 12.5); ctx.bezierCurveTo(34, 17.5, 30.5, 22, 27, 18.5); ctx.bezierCurveTo(24, 15, 19, 13.5, 15, 13); ctx.bezierCurveTo(12.5, 12, 11.5, 10, 11, 7.5); ctx.closePath(); fs(ctx, WHITE, 2);
    ctx.strokeStyle = WHITE_D; ctx.lineWidth = 1.1; ctx.beginPath(); ctx.moveTo(15, 9); ctx.quadraticCurveTo(23, 9.5, 28.5, 15); ctx.stroke();
    if (expr === 'happy') { ctx.strokeStyle = '#7a2b2b'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(13, 14.6); ctx.quadraticCurveTo(16, 17, 19.4, 14.6); ctx.stroke(); }

    // sunglasses: red frame, green lenses, temple to the ear
    ctx.strokeStyle = OUT; ctx.lineWidth = 4.4; ctx.beginPath(); ctx.moveTo(-1, -1.6); ctx.lineTo(-9.4, 0.2); ctx.stroke();
    ctx.strokeStyle = RED; ctx.lineWidth = 2.2; ctx.stroke();
    const lens = (x, y, w, h) => {
      rr(ctx, x, y, w, h, 3);
      ctx.fillStyle = LENS; ctx.fill();
      ctx.lineWidth = 4.4; ctx.strokeStyle = OUT; ctx.stroke();
      ctx.lineWidth = 2.3; ctx.strokeStyle = RED; ctx.stroke();
      ctx.fillStyle = LENS_L; ctx.globalAlpha = 0.8;
      ctx.beginPath(); ctx.moveTo(x + 1.8, y + 1.6); ctx.lineTo(x + 5.2, y + 1.6); ctx.lineTo(x + 2.2, y + h - 1.8); ctx.lineTo(x + 0.4, y + h - 1.8); ctx.closePath(); ctx.fill();
      ctx.globalAlpha = 1;
    };
    lens(-1.6, -5.8, 10.6, 8.8); lens(10.2, -5.8, 8.8, 8.8);
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.7;
    if (expr === 'dead') { [[3.7, -1.4], [14.6, -1.4]].forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(x - 2.6, y - 2.6); ctx.lineTo(x + 2.6, y + 2.6); ctx.moveTo(x + 2.6, y - 2.6); ctx.lineTo(x - 2.6, y + 2.6); ctx.stroke(); }); }
    else if (expr === 'hurt') { [[2, -1.4], [13.4, -1.4]].forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(x, y - 2.6); ctx.lineTo(x + 4.6, y); ctx.lineTo(x, y + 2.6); ctx.stroke(); }); }
    else if (expr === 'happy') { [[3.7, 0.8], [14.6, 0.8]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 2.6, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); }); }

    // fluffy white brows (angry when focused / shouting, raised when hurt or happy)
    const lift = expr === 'hurt' ? -2.4 : expr === 'happy' ? -1.3 : 0;
    const drop = expr === 'focus' || expr === 'shout' ? 2.6 : expr === 'hurt' ? -1.6 : 0;
    const brow = (x0, y0, cx, cy, x1, y1) => {
      ctx.beginPath(); ctx.moveTo(x0, y0); ctx.quadraticCurveTo(cx, cy, x1, y1);
      ctx.strokeStyle = OUT; ctx.lineWidth = 6; ctx.stroke(); ctx.strokeStyle = WHITE; ctx.lineWidth = 3.4; ctx.stroke();
    };
    brow(-1.8, -8 + lift, 3.6, -12.4 + lift, 8.4, -9.4 + lift + drop * 0.35);
    brow(10.4, -9.4 + lift + drop * 0.6, 14.6, -12.2 + lift + drop * 0.4, 19.2, -8.6 + lift + drop);
  }

  // ------------------------------------------------------------------ the bastone (staff)
  /** A knotted wooden staff along +x: back end at x = -8, grip around x = 0..10, knotted head at x = len. */
  function staff(ctx, len, glow, t) {
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    if (glow) {
      const pulse = 0.28 + Math.sin(t * 10) * 0.08;
      ctx.fillStyle = `rgba(255,209,102,${pulse})`;
      ctx.beginPath(); ctx.moveTo(-4, -8); ctx.lineTo(len - 6, -9); ctx.lineTo(len + 12, 0); ctx.lineTo(len - 6, 9); ctx.lineTo(-4, 8); ctx.closePath(); ctx.fill();
    }
    const shaft = () => {
      ctx.beginPath(); ctx.moveTo(-8, 0);
      const n = 6, step = (len - 8) / n;
      for (let i = 1; i <= n; i++) ctx.quadraticCurveTo(-8 + step * (i - 0.5), (i % 2 ? -1.6 : 1.6), -8 + step * i, 0);
    };
    shaft(); ctx.strokeStyle = OUT; ctx.lineWidth = 7.4; ctx.stroke();
    shaft(); ctx.strokeStyle = WOOD; ctx.lineWidth = 4.2; ctx.stroke();
    shaft(); ctx.strokeStyle = WOOD_L; ctx.lineWidth = 1.2; ctx.translate(0, -1.1); ctx.stroke(); ctx.translate(0, 1.1);
    ctx.strokeStyle = WOOD_D; ctx.lineWidth = 1.4;
    for (let i = 1; i < 5; i++) { const x = -8 + ((len - 8) * i) / 5; ctx.beginPath(); ctx.moveTo(x, -2); ctx.lineTo(x + 1.4, 2.2); ctx.stroke(); } // knots
    // the big knotted head
    ctx.beginPath();
    ctx.moveTo(len - 9, -3); ctx.bezierCurveTo(len - 8, -9, len - 1, -11, len + 3, -9); ctx.bezierCurveTo(len + 9, -8, len + 9, -1, len + 7, 2);
    ctx.bezierCurveTo(len + 8, 7, len + 2, 10, len - 3, 8); ctx.bezierCurveTo(len - 8, 7, len - 10, 3, len - 9, -3); ctx.closePath();
    fs(ctx, '#c98b43', 2);
    ctx.strokeStyle = WOOD_D; ctx.lineWidth = 1.5;
    ctx.beginPath(); ctx.arc(len, -1, 3.8, 0.4, 4.6); ctx.moveTo(len - 6, 4); ctx.quadraticCurveTo(len - 2, 1, len - 5, -3); ctx.stroke();
    ctx.restore();
  }

  // ------------------------------------------------------------------ the Sensei
  /**
   * s = { t, mode:'run'|'skis'|'staff', air, vy, expr, blink, throwP (0..1 or -1), raise (0..1), pencil, runRate,
   *       skate (on the ice rink), handle: {x,y} (pushing the stroller: hands go there, in sprite coordinates) }
   */
  function sensei(ctx, s) {
    const t = s.t, mode = s.mode;
    const skis = mode === 'skis', push = !!s.handle;
    const skate = !!s.skate && !s.air && !skis && !push;
    const ph = skis ? 0 : skate ? t * 3.4 : t * (s.runRate || 13);
    const sw = Math.sin(ph);
    const bob = !s.air && !skis && !skate ? Math.abs(Math.cos(ph)) * 2 : 0;
    let hipY, lean, bf, ff;
    if (skis) {
      hipY = -15 - Math.sin(t * 5) * 0.8; lean = 0.34 + (s.air ? -0.1 : 0);
      bf = { x: -10, y: -4 }; ff = { x: 9, y: -4 };
    } else if (s.air) {
      hipY = -18; lean = 0.06 + U.clamp(s.vy / 2400, -0.1, 0.16);
      if (s.vy < 0) { bf = { x: -9, y: -9 }; ff = { x: 8, y: -13 }; } else { bf = { x: -7, y: -4 }; ff = { x: 9, y: -8 }; }
    } else if (skate) {
      hipY = -15; lean = 0.2;
      bf = { x: -12 - sw * 4, y: -Math.max(0, -sw) * 3.5 }; ff = { x: 9 + sw * 2.5, y: 0 };
    } else {
      hipY = -14 - bob; lean = push ? 0.36 : 0.1;
      const l = (p) => ({ x: Math.sin(p) * 11, y: -Math.max(0, Math.cos(p)) * 5 });
      bf = l(ph + Math.PI); ff = l(ph);
    }
    const hip = { x: 0, y: hipY };
    const lift = skate ? 4.5 : 0;

    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    const plank = (dx, col) => {
      ctx.save(); ctx.translate(dx, 0);
      ctx.beginPath(); ctx.moveTo(-26, -4); ctx.lineTo(26, -4); ctx.quadraticCurveTo(36, -4, 40, -10); ctx.lineTo(34, -1.5); ctx.quadraticCurveTo(30, 0, 24, 0); ctx.lineTo(-26, 0); ctx.closePath();
      fs(ctx, col, 2); ctx.fillStyle = '#fff'; ctx.fillRect(-10, -3.2, 18, 1.6);
      ctx.restore();
    };
    if (skis) plank(-2, '#c42f3c');

    const blade = (x, y) => {
      ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(x - 4, y); ctx.lineTo(x - 4, y - 3); ctx.moveTo(x + 5, y); ctx.lineTo(x + 5, y - 3); ctx.stroke();
      const path = () => { ctx.beginPath(); ctx.moveTo(x - 9, y - 0.8); ctx.lineTo(x + 7, y - 0.8); ctx.quadraticCurveTo(x + 11.5, y - 0.8, x + 12, y - 4.4); };
      path(); ctx.strokeStyle = OUT; ctx.lineWidth = 3.6; ctx.stroke(); path(); ctx.strokeStyle = '#e3edf8'; ctx.lineWidth = 1.7; ctx.stroke();
    };
    const legs = (foot, kd) => {
      const f = { x: foot.x, y: foot.y - lift };
      const k = ik(hip, f, 9.2, 9.2, kd);
      limb(ctx, [hip, k, k.end], 10, PURPLE);
      ell(ctx, k.end.x + 2, k.end.y - 0.4, 6.6, 3.7, skis ? 0 : -0.05); fs(ctx, SHOE, 1.8);
      if (skate) blade(k.end.x + 2, foot.y);
    };

    const sh = { x: 1, y: -18 };
    // arm geometry: forward kinematics from two angles, or IK towards a point (pushing the stroller)
    const target = push ? (() => {
      const dx = s.handle.x - hip.x, dy = s.handle.y - hip.y, c = Math.cos(lean), n = Math.sin(lean);
      return { x: dx * c + dy * n, y: -dx * n + dy * c };
    })() : null;
    const armPose = (back) => {
      let a1, a2;
      if (s.raise > 0) { const k = s.raise; a1 = (back ? 3.62 : 2.66) + Math.sin(t * 22) * 0.12 * k; a2 = a1 + (back ? 0.1 : -0.1); }
      else if (skis) { a1 = back ? -0.9 : 0.5; a2 = back ? -0.5 : 0.95; }
      else if (s.air) { a1 = back ? -1.1 : 1.05; a2 = a1 + (back ? -0.3 : 0.5); }
      else if (skate) { a1 = back ? -0.55 + sw * 0.2 : 0.7 - sw * 0.2; a2 = a1 + (back ? -0.3 : 0.5); }
      else { a1 = (back ? 1 : -1) * sw * 0.95; a2 = a1 + 1.05; if (back) a2 = a1 + 0.6; }
      return [a1, a2];
    };
    const armGeom = (pose, back) => {
      if (push) { const e = ik(sh, { x: target.x + (back ? 0 : 3), y: target.y + (back ? 1 : 0) }, 9, 9, -1); return { el: { x: e.x, y: e.y }, hd: e.end, a: 1.2 }; }
      const [a1, a2] = pose;
      const el = { x: sh.x + Math.sin(a1) * 9, y: sh.y + Math.cos(a1) * 9 };
      return { el, hd: { x: el.x + Math.sin(a2) * 9, y: el.y + Math.cos(a2) * 9 }, a: a2 };
    };
    const drawArm = (g) => {
      limb(ctx, [sh, g.el, g.hd], 7.8, ORANGE);
      ctx.beginPath(); ctx.arc(g.hd.x, g.hd.y, 4.4, 0, 7); fs(ctx, WHITE, 1.6);                     // white cuff
      ctx.beginPath(); ctx.arc(g.hd.x + Math.sin(g.a) * 3, g.hd.y + Math.cos(g.a) * 3, 3.2, 0, 7); fs(ctx, SK, 1.6); // hand
      return g.hd;
    };

    // ---- walking staff (when no power-up changes his hands): carried upright BEHIND the body, gripped by the front hand
    const front0 = (() => { // front-arm geometry for the carried pose, computed up front so the staff can sit behind the torso
      if (mode === 'staff' || skis || push) return null;
      let fp0 = armPose(false);
      if (s.throwP != null && s.throwP >= 0) { const p = U.clamp(s.throwP, 0, 1); const a = U.lerp(-1.5, 1.7, U.smooth(p)); fp0 = [a, a + (1 - p) * -0.7 + 0.1]; }
      return { g: armGeom(fp0, false), fp: fp0 };
    })();
    if (front0) {
      ctx.save(); ctx.translate(hip.x, hip.y); ctx.rotate(lean);
      ctx.translate(front0.g.hd.x, front0.g.hd.y); ctx.rotate(-Math.PI / 2 - 0.16 - lean * 0.5); ctx.translate(-4, 0); staff(ctx, 60, 0, t);
      ctx.restore();
    }

    // ---- back leg, shell, back arm
    legs(bf, 1);
    ctx.save(); ctx.translate(hip.x, hip.y); ctx.rotate(lean);
    // turtle shell backpack
    ctx.beginPath(); ctx.ellipse(-12.5, -14, 15.5, 19.5, -0.12, 0, 7); fs(ctx, SHELL, 2.2);
    ctx.save(); ctx.beginPath(); ctx.ellipse(-12.5, -14, 15.5, 19.5, -0.12, 0, 7); ctx.clip();
    ctx.strokeStyle = SHELL_D; ctx.lineWidth = 1.6;
    ctx.beginPath(); ctx.moveTo(-12.5, -36); ctx.lineTo(-12.5, 8);
    ctx.moveTo(-30, -24); ctx.quadraticCurveTo(-12, -20, 6, -24); ctx.moveTo(-30, -12); ctx.quadraticCurveTo(-12, -8, 6, -12); ctx.moveTo(-30, 0); ctx.quadraticCurveTo(-12, 4, 6, 0); ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.22)'; ctx.beginPath(); ctx.ellipse(-20, -22, 4, 8, 0.5, 0, 7); ctx.fill();
    ctx.restore();
    const back = armGeom(armPose(true), true); drawArm(back);
    ctx.restore();

    // ---- torso: orange jacket, white shirt with frog buttons, brown straps
    ctx.save(); ctx.translate(hip.x, hip.y); ctx.rotate(lean);
    ell(ctx, 1, -11, 13.4, 15.4); fs(ctx, ORANGE, 2.2);
    ctx.strokeStyle = ORANGE_D; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(1, -11, 11, 0.5, 2.2); ctx.stroke();
    rr(ctx, 5.8, -23, 6, 22, 2.6); fs(ctx, WHITE, 1.5);
    ctx.fillStyle = OUT; [-19, -13, -7].forEach((y) => ctx.fillRect(6.6, y, 4.4, 1.5));
    ctx.fillStyle = '#c4c6d2'; ctx.fillRect(6.4, -2.6, 5.2, 3.2);
    ctx.strokeStyle = OUT; ctx.lineWidth = 3.8; ctx.beginPath(); ctx.moveTo(-3, -24); ctx.lineTo(4, -3); ctx.stroke();
    ctx.strokeStyle = '#d6b184'; ctx.lineWidth = 2; ctx.stroke();
    ctx.restore();

    legs(ff, 1);

    // Matita power-up: the pencil sticks out of the hips
    if (s.pencil && !skis) {
      ctx.save(); ctx.translate(hip.x + 3, hip.y + 0.5); ctx.rotate(lean * 0.4 - 0.04 + Math.sin(t * 13) * 0.025);
      Art.pencil(ctx, 44, t); ctx.restore();
    }

    // ---- head
    ctx.save(); ctx.translate(hip.x, hip.y); ctx.rotate(lean);
    ctx.translate(3, -35.5 - (s.expr === 'shout' ? 1 : 0)); ctx.rotate(-lean * 0.8 + Math.sin(ph * 2) * 0.03);
    senseiHead(ctx, { expr: s.expr, blink: s.blink });
    ctx.restore();

    // ---- front arm (+ staff / ski poles)
    ctx.save(); ctx.translate(hip.x, hip.y); ctx.rotate(lean);
    let fp = armPose(false);
    if (mode === 'staff') { const sa = 2.25 + Math.sin(t * 9) * 0.22; fp = [1.9 + Math.sin(t * 9) * 0.15, sa]; }
    if (s.throwP != null && s.throwP >= 0 && !push) { const p = U.clamp(s.throwP, 0, 1); const a = U.lerp(-1.5, 1.7, U.smooth(p)); fp = [a, a + (1 - p) * -0.7 + 0.1]; }
    const front = front0 ? front0.g : armGeom(fp, false), hand = drawArm(front);
    if (mode === 'staff') {
      ctx.save(); ctx.translate(hand.x, hand.y); ctx.rotate(Math.PI / 2 - fp[1]); ctx.translate(-4, 0); staff(ctx, 84, 1, t); ctx.restore();
    } else if (skis) {
      ctx.save(); ctx.translate(hand.x, hand.y);
      ctx.strokeStyle = OUT; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-22, 22); ctx.stroke();
      ctx.strokeStyle = '#8895a8'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-22, 22); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    if (skis) plank(2, '#ff4d5e');
    ctx.restore();
  }

  // ------------------------------------------------------------------ the passeggino (stroller with a little girl)
  /** s = { t, expr, throwP, raise }. The Sensei pushes a pastel stroller; a little girl rides in it, waving. Wheels touch y = 0. */
  function stroller(ctx, s) {
    const t = s.t, rot = t * 15;
    ctx.save(); ctx.translate(0, Math.sin(t * 34) * 0.5); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const PINK = '#ff7aa8', PINK_D = '#e0558a', CREAM = '#fff4ea', TEAL = '#7fd6d0';
    const wheel = (x, y, r) => {
      ctx.beginPath(); ctx.arc(x, y, r, 0, 7); fs(ctx, '#2a2d38', 2.2);
      ctx.beginPath(); ctx.arc(x, y, r * 0.5, 0, 7); fs(ctx, '#d9dfea', 1.5);
      ctx.strokeStyle = '#8b93a5'; ctx.lineWidth = 1.2;
      for (let i = 0; i < 3; i++) { const a = rot + (i * Math.PI) / 3; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5); ctx.lineTo(x - Math.cos(a) * r * 0.5, y - Math.sin(a) * r * 0.5); ctx.stroke(); }
    };
    const handle = { x: -22, y: -36 };

    // chassis + handle (behind the bucket)
    const bar = (pts, w, col) => { limb(ctx, pts, w, col); };
    bar([{ x: 8, y: -10 }, { x: 12, y: -22 }], 3, '#9aa3b5');
    bar([{ x: 46, y: -9 }, { x: 40, y: -22 }], 3, '#9aa3b5');
    bar([{ x: 14, y: -26 }, { x: -2, y: -34 }, handle], 3.2, '#aeb6c6');
    wheel(8, -9, 9);

    // canopy (behind the girl)
    ctx.beginPath(); ctx.moveTo(2, -42); ctx.bezierCurveTo(-4, -68, 16, -80, 36, -68); ctx.lineTo(27, -43); ctx.closePath(); fs(ctx, PINK, 2.2);
    ctx.save(); ctx.beginPath(); ctx.moveTo(2, -42); ctx.bezierCurveTo(-4, -68, 16, -80, 36, -68); ctx.lineTo(27, -43); ctx.closePath(); ctx.clip();
    ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2;
    for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(8, -43); ctx.quadraticCurveTo(4 + i * 7, -62, 10 + i * 8, -78); ctx.stroke(); }
    ctx.restore();

    // the little girl
    const hx = 35, hy = -53;
    // pigtails flapping in the wind
    [[-1, 0], [1, 1]].forEach(([d, i]) => {
      const fl = Math.sin(t * 15 + i * 2) * 3;
      ctx.beginPath(); ctx.moveTo(hx - 6, hy - 3 + i * 5); ctx.quadraticCurveTo(hx - 15, hy - 1 + i * 6 + fl, hx - 19, hy + 5 + i * 5 + fl * 1.4); ctx.strokeStyle = OUT; ctx.lineWidth = 7; ctx.stroke(); ctx.strokeStyle = '#8a4f2a'; ctx.lineWidth = 4; ctx.stroke();
      ctx.beginPath(); ctx.arc(hx - 8.5, hy - 2.4 + i * 5, 2.8, 0, 7); fs(ctx, '#ff4d8d', 1.3);
    });
    ctx.beginPath(); ctx.arc(hx, hy, 10, 0, 7); fs(ctx, '#ffd9bd', 2.2);
    ctx.beginPath(); ctx.arc(hx - 0.6, hy - 1.6, 10.3, Math.PI * 1.02, Math.PI * 2.02); ctx.lineTo(hx + 8, hy - 5.5); ctx.quadraticCurveTo(hx + 2, hy - 8.4, hx - 9.4, hy - 3.2); ctx.closePath(); fs(ctx, '#8a4f2a', 1.8); // fringe
    const blink = (t % 2.6) < 0.1;
    [[hx + 0.6, hy + 0.8], [hx + 6.6, hy + 0.8]].forEach(([x, y]) => {
      if (blink) { ctx.strokeStyle = '#3a2214'; ctx.lineWidth = 1.4; ctx.beginPath(); ctx.moveTo(x - 2, y); ctx.lineTo(x + 2, y); ctx.stroke(); return; }
      ctx.fillStyle = '#2b1a10'; ctx.beginPath(); ctx.ellipse(x, y, 2, 2.5, 0, 0, 7); ctx.fill();
      ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + 0.7, y - 0.8, 0.8, 0, 7); ctx.fill();
    });
    ctx.fillStyle = 'rgba(255,110,140,0.5)'; ctx.beginPath(); ctx.arc(hx - 3, hy + 4.4, 2.2, 0, 7); ctx.arc(hx + 9, hy + 4.4, 2.2, 0, 7); ctx.fill();
    ctx.strokeStyle = '#7a2b2b'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.arc(hx + 4.4, hy + 3.6, 3.4, 0.25, Math.PI - 0.25); ctx.stroke(); // big smile
    // dress top + waving arm
    ctx.beginPath(); ctx.moveTo(hx - 9, hy + 9); ctx.quadraticCurveTo(hx - 11, hy + 21, hx - 7, hy + 26); ctx.lineTo(hx + 12, hy + 26); ctx.quadraticCurveTo(hx + 12, hy + 14, hx + 8, hy + 9); ctx.closePath(); fs(ctx, '#ffe066', 2);
    const wv = Math.sin(t * 11) * 0.5;
    const ah = { x: hx + 12 + Math.sin(wv) * 6, y: hy - 4 - Math.cos(wv) * 5 };
    limb(ctx, [{ x: hx + 8, y: hy + 14 }, { x: hx + 14, y: hy + 6 }, ah], 4.6, '#ffd9bd');
    ctx.beginPath(); ctx.arc(ah.x, ah.y, 3, 0, 7); fs(ctx, '#ffd9bd', 1.5);

    // bucket (in front of her lower body), with a pink band and a little star
    ctx.beginPath(); ctx.moveTo(3, -44); ctx.lineTo(50, -40); ctx.quadraticCurveTo(54, -24, 40, -17); ctx.lineTo(15, -15); ctx.quadraticCurveTo(0, -21, 3, -44); ctx.closePath(); fs(ctx, CREAM, 2.2);
    ctx.save(); ctx.beginPath(); ctx.moveTo(3, -44); ctx.lineTo(50, -40); ctx.quadraticCurveTo(54, -24, 40, -17); ctx.lineTo(15, -15); ctx.quadraticCurveTo(0, -21, 3, -44); ctx.closePath(); ctx.clip();
    ctx.fillStyle = PINK_D; ctx.fillRect(0, -45, 60, 5.5); ctx.fillStyle = TEAL; ctx.fillRect(0, -24, 60, 4);
    ctx.restore();
    star(ctx, 27, -31, 4.6, t); ctx.fillStyle = '#ffd23f'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.2; ctx.stroke();
    wheel(46, -8, 8);
    // front bar for tiny hands
    limb(ctx, [{ x: 4, y: -40 }, { x: 50, y: -37 }], 2.6, '#aeb6c6');

    // the Sensei pushes from behind
    ctx.save(); ctx.translate(-48, 0);
    sensei(ctx, { t: s.t, mode: 'run', air: false, vy: 0, expr: s.expr || 'happy', blink: false, runRate: 13, handle: { x: handle.x + 48, y: handle.y } });
    ctx.restore();
    ctx.restore();
  }

  // ------------------------------------------------------------------ falce e martello
  /** The emblem in gold on transparent, ~38px across and centred. */
  function hammerSickle(ctx) {
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const GOLD = '#ffd23f';
    const rod = (x0, y0, x1, y1) => { ctx.beginPath(); ctx.moveTo(x0, y0); ctx.lineTo(x1, y1); ctx.strokeStyle = OUT; ctx.lineWidth = 7.6; ctx.stroke(); ctx.strokeStyle = GOLD; ctx.lineWidth = 4.2; ctx.stroke(); };
    // hammer: handle from lower right to upper left, heavy head across the top
    rod(12, 16, -6, -4);
    ctx.save(); ctx.translate(-8.5, -8.5); ctx.rotate(-0.73); rr(ctx, -10.5, -5.2, 21, 10.4, 2.4); fs(ctx, GOLD, 2.2); ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(-8.5, -3.4, 16, 2); ctx.restore();
    // sickle: handle at the lower left, a tapering blade sweeping over the top to a sharp tip
    rod(-5.5, 11.5, -12, 18);
    const cx = 1, cy = -1.5, R = 13.5, a0 = 2.0, a1 = 5.75, N = 22;
    const wAt = (k) => 7.4 - 6.2 * k;
    ctx.beginPath();
    for (let i = 0; i <= N; i++) { const k = i / N, a = a0 + (a1 - a0) * k, r = R + wAt(k) / 2; ctx[i ? 'lineTo' : 'moveTo'](cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    for (let i = N; i >= 0; i--) { const k = i / N, a = a0 + (a1 - a0) * k, r = R - wAt(k) / 2; ctx.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); }
    ctx.closePath(); fs(ctx, GOLD, 2.2);
    ctx.restore();
  }

  // ------------------------------------------------------------------ profilo alare (obstacle of the "tavola d'acqua")
  // A technical drawing of an airfoil, like the textbook figure: grey section with a heavy outline, the chord line, the dash-dot
  // camber line, the leading-edge circle and double-headed dimension arrows. The shape is a cambered NACA-style section.
  const WING_C = 104, WING_X0 = -38;              // chord length, x of the leading edge (the hit box is the first 76px: the tail is a thin sliver)
  const WING = (() => {
    const m = 0.09, p = 0.4, tt = 0.28, N = 44, up = [], lo = [], cam = [];
    let low = 0;
    for (let i = 0; i <= N; i++) {
      const x = (1 - Math.cos((Math.PI * i) / N)) / 2;     // cosine spacing: a round nose
      const yt = 5 * tt * (0.2969 * Math.sqrt(x) - 0.126 * x - 0.3516 * x * x + 0.2843 * x ** 3 - 0.1036 * x ** 4);
      const yc = x < p ? (m / (p * p)) * (2 * p * x - x * x) : (m / ((1 - p) * (1 - p))) * (1 - 2 * p + 2 * p * x - x * x);
      const dy = (2 * m / (x < p ? p * p : (1 - p) * (1 - p))) * (p - x), th = Math.atan(dy);
      up.push([x - yt * Math.sin(th), yc + yt * Math.cos(th)]); lo.push([x + yt * Math.sin(th), yc - yt * Math.cos(th)]); cam.push([x, yc]);
      low = Math.min(low, yc - yt * Math.cos(th));
    }
    // y (up, in chords) -> canvas y: the lowest point of the section rests on the ice (y = 0)
    const cy = (y) => WING_C * (low - y), cx = (x) => WING_X0 + WING_C * x;
    return { up, lo, cam, cy, cx, chordY: WING_C * low, camMax: Math.max(...cam.map((c) => c[1])), r: 1.1019 * tt * tt };
  })();
  /** Airfoil drawing, bottom at y = 0, the leading edge at x = -38 (the left edge of the hit box), the trailing edge at x = 66. */
  function wingProfile(ctx, t) {
    const W = WING, ink = OUT, thin = 'rgba(28,32,51,0.8)';
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const pt = (a) => [W.cx(a[0]), W.cy(a[1])];
    // thin leader lines coming in from the top-right, as in the figure
    ctx.strokeStyle = 'rgba(28,32,51,0.45)'; ctx.lineWidth = 0.9;
    ctx.beginPath(); [[-14, -23], [10, -26], [36, -17]].forEach(([x, y]) => { ctx.moveTo(x, y); ctx.lineTo(x + 24, y - 20); }); ctx.stroke();
    // dashed tangent from above the nose down to the trailing edge
    ctx.strokeStyle = thin; ctx.lineWidth = 0.9; ctx.setLineDash([3, 2.4]);
    ctx.beginPath(); ctx.moveTo(WING_X0 - 6, W.cy(W.camMax) - 9); ctx.lineTo(W.cx(1), W.cy(0)); ctx.stroke(); ctx.setLineDash([]);
    // the grey section
    ctx.beginPath();
    W.up.forEach((a, i) => { const [x, y] = pt(a); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); });
    for (let i = W.lo.length - 1; i >= 0; i--) { const [x, y] = pt(W.lo[i]); ctx.lineTo(x, y); }
    ctx.closePath(); ctx.fillStyle = '#e6e8ec'; ctx.fill(); ctx.lineWidth = 2.6; ctx.strokeStyle = ink; ctx.stroke();
    // chord line (a little longer than the section at both ends)
    ctx.strokeStyle = ink; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(WING_X0 - 6, W.chordY); ctx.lineTo(W.cx(1) + 6, W.cy(0)); ctx.stroke();
    // leading-edge circle
    const rr_ = W.r * WING_C; ctx.lineWidth = 0.9; ctx.strokeStyle = thin; ctx.beginPath(); ctx.arc(WING_X0 + rr_, W.cy(0.04), rr_, 0, 7); ctx.stroke();
    // mean camber line: dash-dot
    ctx.lineWidth = 1.1; ctx.strokeStyle = thin; ctx.setLineDash([5, 2, 1.3, 2]);
    ctx.beginPath(); W.cam.forEach((a, i) => { const [x, y] = pt(a); i ? ctx.lineTo(x, y) : ctx.moveTo(x, y); }); ctx.stroke(); ctx.setLineDash([]);
    // double-headed dimension arrows: camber (left of the nose) and thickness (inside, twice)
    const arrow = (x, y0, y1) => {
      ctx.strokeStyle = ink; ctx.fillStyle = ink; ctx.lineWidth = 1.1;
      ctx.beginPath(); ctx.moveTo(x, y0); ctx.lineTo(x, y1); ctx.stroke();
      const d = y1 < y0 ? 1 : -1;
      [[y0, -d], [y1, d]].forEach(([y, s]) => { ctx.beginPath(); ctx.moveTo(x, y); ctx.lineTo(x - 1.9, y + s * 4.2); ctx.lineTo(x + 1.9, y + s * 4.2); ctx.closePath(); ctx.fill(); });
    };
    const near = (arr, x) => arr[Math.max(0, arr.findIndex((a) => a[0] >= x))];
    [0.3, 0.55].forEach((x) => { const u = pt(near(W.up, x)), l = pt(near(W.lo, x)); arrow(u[0], u[1] + 1.2, l[1] - 1.2); });
    arrow(WING_X0 - 6, W.chordY, W.cy(W.camMax) - 9);
    ctx.lineWidth = 0.9; ctx.beginPath(); ctx.moveTo(WING_X0 - 10, W.cy(W.camMax) - 9); ctx.lineTo(WING_X0 - 2, W.cy(W.camMax) - 9); ctx.stroke();
    ctx.restore();
  }

  // ------------------------------------------------------------------ Mr. Hall (faces +x; the caller flips)
  // A younger Francone: just as tall and lanky and the same stalk / wind-up / lunge, but with dark swept-back hair, no beard, a
  // navy suit with a red tie, light-blue tinted glasses and a big red pen (he is the reviewer: "Modifica painful", "as is").
  /** s = { t, state } */
  function hall(ctx, s) {
    const t = s.t, st = s.state;
    const walking = st === 'enter' || st === 'return' || st === 'stalk' || st === 'leave';
    const sh = walking ? Math.sin(t * (st === 'stalk' ? 5.5 : 12)) : 0;
    const lunging = st === 'lunge', winding = st === 'windup', stun = st === 'stun', dead = st === 'dead';
    const lean = lunging ? 0.5 : winding ? -0.12 : stun ? -0.22 : 0.08 + Math.sin(t * 2.4) * 0.025;
    const jaw = lunging ? 1 : winding ? 0.55 + Math.sin(t * 40) * 0.25 : stun ? 0.6 : 0;
    const quake = winding ? Math.sin(t * 60) * 1.8 : 0;
    const HIP = -43;
    const PANT = '#34406c', SUIT = '#2e3b69', SUIT_D = '#1f2850', SHIRT = '#f4f6fa', TIE = '#d63a3a', SKIN_H = '#f1c4a4', HAIR_H = '#33241d', PEN = '#e63946';
    ctx.save(); ctx.translate(quake, 0); ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    // legs: long, in suit trousers, black shoes
    [0, 1].forEach((i) => {
      const x = i ? 7 - sh * 8 : -6 + sh * 8;
      const lift = walking ? Math.max(0, (i ? -sh : sh)) * 5.5 : lunging ? (i ? 6 : 0) : 0;
      const hipP = { x: x * 0.2, y: HIP + 3 }, foot = { x, y: -3 - lift };
      const k = ik(hipP, foot, 21, 21, 1);
      limb(ctx, [hipP, k, k.end], 6.4, i ? PANT : '#2a3560');
      ell(ctx, foot.x + 3.5, foot.y - 1.2, 8, 3.6); fs(ctx, '#1b1c26', 1.8);
    });

    ctx.save(); ctx.translate(0, HIP); ctx.rotate(lean);
    const reach = lunging ? 1.52 : winding ? 2.2 : 0.75 + Math.sin(t * 4.4) * 0.12;
    const SHD = { x: 2, y: -30 };
    const arm = (a) => {
      const el = { x: SHD.x + Math.sin(a) * 13, y: SHD.y + Math.cos(a) * 13 };
      const hd = { x: el.x + Math.sin(a + 0.1) * 13, y: el.y + Math.cos(a + 0.1) * 13 };
      limb(ctx, [SHD, el, hd], 5.8, SUIT);
      ctx.beginPath(); ctx.arc(hd.x, hd.y, 3.2, 0, 7); ctx.fillStyle = SHIRT; ctx.fill();                       // cuff
      if (lunging || winding) { // claws
        ctx.strokeStyle = OUT; ctx.lineWidth = 1.8;
        for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(hd.x, hd.y); ctx.lineTo(hd.x + Math.sin(a + 0.1) * 8 + i * 3, hd.y + Math.cos(a + 0.1) * 8 + i * 2); ctx.stroke(); }
      } else { ctx.beginPath(); ctx.arc(hd.x + Math.sin(a + 0.1) * 2, hd.y + Math.cos(a + 0.1) * 2, 3, 0, 7); fs(ctx, SKIN_H, 1.6); }
      return hd;
    };
    arm(reach - 0.35);
    // jacket, white shirt, red tie
    rr(ctx, -9.5, -36, 19, 42, 7); fs(ctx, SUIT);
    ctx.fillStyle = SHIRT; ctx.beginPath(); ctx.moveTo(-2.5, -35.5); ctx.lineTo(7, -35.5); ctx.lineTo(2.2, -12); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = SUIT_D; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-2.5, -35.5); ctx.lineTo(2.2, -12); ctx.lineTo(7, -35.5); ctx.moveTo(2.2, -12); ctx.lineTo(2.2, 5); ctx.stroke(); // lapels + opening
    ctx.beginPath(); ctx.moveTo(1.2, -34); ctx.lineTo(4.4, -34); ctx.lineTo(5, -14); ctx.lineTo(2.9, -9); ctx.lineTo(1, -14); ctx.closePath(); fs(ctx, TIE, 1.4);                                      // tie
    ctx.fillStyle = SUIT_D; [-2, 3].forEach((y) => { ctx.beginPath(); ctx.arc(5.6, y, 1.3, 0, 7); ctx.fill(); });                                                                              // buttons

    // head
    ctx.save(); ctx.translate(11, -47); ctx.rotate(-lean * 0.7 + (stun ? Math.sin(t * 18) * 0.15 : 0));
    ell(ctx, -3, -3, 9.6, 10.5); fs(ctx, HAIR_H, 1.8);                                                  // hair mass at the back
    ell(ctx, -3, 2, 2.6, 3.2); fs(ctx, '#e3a98a', 1.4);                                                  // ear
    ell(ctx, 0.5, 0, 9.6, 12.2); fs(ctx, SKIN_H, 2.2);                                                   // face: long, a strong jaw
    ctx.fillStyle = 'rgba(60,35,25,0.22)'; ctx.beginPath(); ctx.moveTo(-4, 5); ctx.quadraticCurveTo(2, 14, 9, 9); ctx.lineTo(9, 5); ctx.quadraticCurveTo(2, 9, -4, 5); ctx.fill(); // five-o'clock shadow
    // dark swept-back hair with a quiff
    ctx.beginPath(); ctx.moveTo(-9.6, -1); ctx.bezierCurveTo(-12, -13, -2, -17.5, 6.5, -14.5); ctx.bezierCurveTo(11.5, -13, 12, -8, 10.4, -6); ctx.bezierCurveTo(7, -9.5, 1, -9, -3, -6.4); ctx.bezierCurveTo(-6, -4.6, -8.4, -3, -9.6, -1); ctx.closePath(); fs(ctx, HAIR_H, 1.8);
    ctx.strokeStyle = '#5a4034'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(-6, -11); ctx.quadraticCurveTo(0, -14.2, 6, -12); ctx.moveTo(-3, -9); ctx.quadraticCurveTo(2, -11.4, 8, -9.4); ctx.stroke();
    // nose
    ell(ctx, 11, 3.2, 3.4, 3.6, 0.12); fs(ctx, '#e8aa8c', 1.6);
    // glasses: dark frame, light-blue lenses
    const gl = stun ? 1.6 : 0;
    ctx.strokeStyle = '#0d0e15'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.moveTo(3, -3.4 + gl); ctx.lineTo(-7.5, -4.4); ctx.stroke();
    rr(ctx, 2.4, -7.4 + gl, 12.6, 9.4, 3); fs(ctx, '#a9d4f0', 2.2);
    ctx.fillStyle = 'rgba(255,255,255,0.75)'; ctx.fillRect(4.6, -5.4 + gl, 4.4, 1.5); ctx.fillRect(4.6, -3.2 + gl, 1.8, 1.2);
    if (dead) { ctx.strokeStyle = '#1c2033'; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(6.4, -5 + gl); ctx.lineTo(12, 0 + gl); ctx.moveTo(12, -5 + gl); ctx.lineTo(6.4, 0 + gl); ctx.stroke(); }
    else if (winding || lunging) { ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(11.6, -2.6 + gl, lunging ? 2.6 : 2.1, 0, 7); ctx.fill(); }
    else { ctx.fillStyle = '#1c2033'; ctx.beginPath(); ctx.arc(10.4, -2.6 + gl, 1.5, 0, 7); ctx.fill(); }  // an eye behind the lens
    // thick dark brow
    ctx.strokeStyle = HAIR_H; ctx.lineWidth = 2.8; ctx.beginPath(); ctx.moveTo(2.6, -10 - (winding ? 1 : 0)); ctx.lineTo(14, -8.2 + (winding || lunging ? 2.4 : 0)); ctx.stroke();
    // mouth: a stern line, wide open to bite
    if (jaw > 0) {
      ctx.save(); ell(ctx, 10.5, 8.5 + jaw * 2, 5, 2.2 + jaw * 5); fs(ctx, '#4a1515', 1.8);
      ctx.clip(); ctx.fillStyle = '#fff';
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(6.2 + i * 2.8, 4); ctx.lineTo(8.2 + i * 2.8, 4); ctx.lineTo(7.2 + i * 2.8, 9); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = '#e8737f'; ell(ctx, 10.4, 14.4 + jaw * 2, 3.4, 2.8); ctx.fill();
      ctx.restore();
    } else {
      ctx.strokeStyle = '#7a3b2c'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(6.4, 8.4); ctx.quadraticCurveTo(10.2, 9 + Math.sin(t * 5) * 0.6, 14, 7.6); ctx.stroke();
    }
    if (stun) { for (let i = 0; i < 3; i++) { const a = t * 6 + (i * Math.PI * 2) / 3; star(ctx, Math.cos(a) * 15, -20 + Math.sin(a) * 4, 4.2, a); fs(ctx, '#ffd166', 1.3); } }
    ctx.restore(); // head
    // front arm + the red pen
    const hd = arm(reach);
    if (!lunging && !winding && !dead) {
      ctx.save(); ctx.translate(hd.x, hd.y); ctx.rotate(-0.55);
      ctx.strokeStyle = OUT; ctx.lineWidth = 6.2; ctx.beginPath(); ctx.moveTo(-4, 0); ctx.lineTo(26, 0); ctx.stroke();
      ctx.strokeStyle = PEN; ctx.lineWidth = 3.6; ctx.beginPath(); ctx.moveTo(-3, 0); ctx.lineTo(22, 0); ctx.stroke();
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(0, -1) ; ctx.lineTo(16, -1); ctx.stroke();
      ctx.beginPath(); ctx.moveTo(22, -2.4); ctx.lineTo(27.5, 0); ctx.lineTo(22, 2.4); ctx.closePath(); fs(ctx, '#1c2033', 1.2);
      ctx.restore();
    }
    ctx.restore(); // torso transform
    ctx.restore();
  }

  // ------------------------------------------------------------------ Cip e Ciop (face +x; the caller flips)
  /** s = { t, state, who:'cip'|'ciop', hiss } — small chipmunks. Cip: black nose and a little hat. Ciop: red nose and a Hawaiian shirt. */
  function chip(ctx, s) {
    const t = s.t, st = s.state, ciop = s.who === 'ciop';
    const crouch = st === 'crouch', leap = st === 'leap', dead = st === 'dead';
    const BROWN = '#b87333', BROWN_D = '#6e3f1a', CREAM = '#f6e3bf';
    const ph = t * 24, wig = crouch ? Math.sin(t * 40) * 1.6 : 0;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (leap) ctx.rotate(-0.3);
    const by = crouch ? -7 : leap ? -13 : -11.5 - Math.abs(Math.sin(ph)) * 1.8;

    // bushy striped tail curling up behind
    const tw = Math.sin(t * (crouch ? 22 : 9)) * 3;
    ctx.beginPath(); ctx.moveTo(-8, by + 1); ctx.bezierCurveTo(-25, by + 6, -29 + tw, by - 20, -15 + tw, by - 22); ctx.bezierCurveTo(-13 + tw, by - 15, -12, by - 6, -4, by - 4); ctx.closePath(); fs(ctx, BROWN, 2);
    ctx.strokeStyle = BROWN_D; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(-17, by - 2); ctx.lineTo(-21 + tw * 0.3, by - 8); ctx.moveTo(-14, by - 8); ctx.lineTo(-20 + tw * 0.6, by - 14); ctx.stroke();

    // legs
    const leg = (x, p, front) => {
      let dx = Math.sin(p) * 5, lf = Math.max(0, Math.cos(p)) * 3;
      if (leap) { dx = front ? 9 : -9; lf = 4; }
      if (crouch) { dx = 0; lf = 0; }
      limb(ctx, [{ x, y: by + 2 }, { x: x + dx, y: -lf - 1.2 }], 4, BROWN);
      ell(ctx, x + dx + 1, -lf - 0.8, 3.4, 2); fs(ctx, BROWN_D, 1.4);
    };
    leg(-6 + wig * 0.3, ph + Math.PI, false); leg(8, ph, true);
    // body: three dark stripes down the back
    ctx.save(); if (crouch) ctx.translate(wig, 0);
    ell(ctx, 0, by, 12.5, crouch ? 6.4 : 7.6, crouch ? 0.12 : 0); fs(ctx, BROWN, 2);
    ctx.save(); ell(ctx, 0, by, 12.5, crouch ? 6.4 : 7.6, crouch ? 0.12 : 0); ctx.clip();
    ctx.strokeStyle = BROWN_D; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(-12, by - 4); ctx.lineTo(12, by - 4); ctx.moveTo(-12, by - 1); ctx.lineTo(12, by - 1); ctx.stroke();
    ctx.fillStyle = CREAM; ctx.fillRect(-12, by - 3, 24, 1.3);
    if (ciop) { // Hawaiian shirt: red with yellow flowers
      ctx.fillStyle = '#e63946'; ctx.fillRect(-4, by + 0.5, 16, 10);
      ctx.fillStyle = '#ffd23f'; [[-1, 3], [4, 5], [9, 3]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, by + y, 1.5, 0, 7); ctx.fill(); });
    } else { ctx.fillStyle = CREAM; ell(ctx, 3, by + 4, 8, 3.4); ctx.fill(); }
    ctx.restore();
    ctx.restore();
    leg(-2, ph, false); leg(12, ph + Math.PI, true);

    // head
    ctx.save(); ctx.translate(crouch ? 12.5 : 13, by - (crouch ? 1 : 6) + (leap ? -2 : 0));
    ctx.beginPath(); ctx.arc(-4, -7.4, 3.6, 0, 7); fs(ctx, BROWN, 1.8); ctx.fillStyle = '#f2a0b3'; ctx.beginPath(); ctx.arc(-4, -7.2, 1.8, 0, 7); ctx.fill(); // far ear
    ctx.beginPath(); ctx.arc(2.6, -8, 3.8, 0, 7); fs(ctx, BROWN, 1.8); ctx.fillStyle = '#f2a0b3'; ctx.beginPath(); ctx.arc(2.6, -7.8, 1.9, 0, 7); ctx.fill();
    ctx.beginPath(); ctx.arc(0, 0, 8.6, 0, 7); fs(ctx, BROWN, 2);
    ell(ctx, 4.4, 3.4, 5.4, 4.6); ctx.fillStyle = CREAM; ctx.fill();              // cheeks / muzzle
    ctx.strokeStyle = BROWN_D; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-3, -7.5); ctx.lineTo(1, -2); ctx.moveTo(-5, -4.4); ctx.lineTo(-1.5, -0.6); ctx.stroke(); // face stripes
    if (dead) { ctx.strokeStyle = '#2b1a10'; ctx.lineWidth = 1.6; [[0.5, -1.6], [6.6, -1.6]].forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(x - 2, y - 2); ctx.lineTo(x + 2, y + 2); ctx.moveTo(x + 2, y - 2); ctx.lineTo(x - 2, y + 2); ctx.stroke(); }); }
    else {
      [[0.8, -1.8], [6.8, -1.8]].forEach(([x, y]) => { ctx.fillStyle = '#1c1410'; ctx.beginPath(); ctx.ellipse(x, y, 2, 2.6, 0, 0, 7); ctx.fill(); ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + 0.7, y - 1, 0.8, 0, 7); ctx.fill(); });
      if (leap || s.hiss) { ctx.strokeStyle = '#2b1a10'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-2, -5.6); ctx.lineTo(3.2, -4); ctx.moveTo(10, -5.6); ctx.lineTo(5.6, -4); ctx.stroke(); }
    }
    ell(ctx, 10.6, 1.4, 2.6, 2); fs(ctx, ciop ? '#e63946' : '#1c1410', 1.2);          // nose: Ciop red, Cip black
    ctx.fillStyle = '#fff'; ctx.strokeStyle = OUT; ctx.lineWidth = 1.1;                 // buck teeth
    rr(ctx, 6.6, 5, 2.4, 3.6, 0.8); ctx.fill(); ctx.stroke(); rr(ctx, 9.2, 5, 2.4, 3.6, 0.8); ctx.fill(); ctx.stroke();
    if (!ciop) { // Cip's little brown hat
      ctx.beginPath(); ctx.ellipse(1, -8, 9, 2.6, -0.08, 0, 7); fs(ctx, '#6e4a2a', 1.6);
      ctx.beginPath(); ctx.moveTo(-5.5, -8.6); ctx.quadraticCurveTo(-4, -15.4, 2, -15); ctx.quadraticCurveTo(7, -14.6, 6.6, -8.8); ctx.closePath(); fs(ctx, '#8a5e36', 1.6);
      ctx.fillStyle = '#d63a3a'; ctx.fillRect(-5, -10.8, 11, 1.8);
    } else { // Ciop's tuft
      ctx.beginPath(); ctx.moveTo(-2, -8.2); ctx.quadraticCurveTo(0.5, -14.5, 4, -9.4); ctx.quadraticCurveTo(5.6, -13, 7.6, -8.4); ctx.closePath(); fs(ctx, BROWN_D, 1.4);
    }
    ctx.restore();
    ctx.restore();
  }

  // ------------------------------------------------------------------ power-up badges (icons for the pick-ups and the HUD)
  function strollerIcon(ctx) {
    ctx.save(); ctx.scale(0.5, 0.5); ctx.translate(-14, 22); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0, -44); ctx.bezierCurveTo(-4, -66, 16, -78, 34, -66); ctx.lineTo(26, -43); ctx.closePath(); fs(ctx, '#ff7aa8', 3.6);
    // the little girl: round face, brown hair with a fringe and a pink bow, two dots for eyes, a smile
    ctx.beginPath(); ctx.arc(34, -50, 12, 0, 7); fs(ctx, '#ffd9bd', 3.4);
    ctx.beginPath(); ctx.arc(33, -51.5, 12.4, Math.PI * 1.02, Math.PI * 2.02); ctx.lineTo(41, -55); ctx.quadraticCurveTo(34, -58, 22, -52); ctx.closePath(); fs(ctx, '#8a4f2a', 2.6);
    ctx.beginPath(); ctx.arc(22, -48, 4, 0, 7); fs(ctx, '#ff4d8d', 2.4);
    ctx.fillStyle = '#2b1a10'; ctx.beginPath(); ctx.arc(31, -48, 1.9, 0, 7); ctx.arc(39, -48, 1.9, 0, 7); ctx.fill();
    ctx.strokeStyle = '#7a2b2b'; ctx.lineWidth = 2.2; ctx.beginPath(); ctx.arc(35, -44.6, 4, 0.3, Math.PI - 0.3); ctx.stroke();
    ctx.beginPath(); ctx.moveTo(0, -44); ctx.lineTo(48, -40); ctx.quadraticCurveTo(52, -24, 40, -17); ctx.lineTo(14, -15); ctx.quadraticCurveTo(-1, -21, 0, -44); ctx.closePath(); fs(ctx, '#fff4ea', 3.6);
    limb(ctx, [{ x: 12, y: -24 }, { x: -8, y: -34 }, { x: -18, y: -35 }], 3.4, '#8b93a5');
    [[8, -8, 9], [44, -8, 8]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); fs(ctx, '#2a2d38', 3.2); ctx.beginPath(); ctx.arc(x, y, r * 0.45, 0, 7); ctx.fillStyle = '#d9dfea'; ctx.fill(); });
    ctx.restore();
  }
  Art.alt.sensei = {
    badge: {
      bike: { color: '#ffc2dc', draw(ctx) { strollerIcon(ctx); } },
      sword: { color: '#e6b87a', draw(ctx, t) { ctx.save(); ctx.rotate(-Math.PI / 4); ctx.translate(-14, 0); staff(ctx, 25, 0, t); ctx.restore(); } },
      shield: { color: '#e63946', draw(ctx) { ctx.save(); ctx.scale(0.5, 0.5); hammerSickle(ctx); ctx.restore(); } },
    },
  };

  Object.assign(Art, { sensei, senseiHead, stroller, staff, hammerSickle, wingProfile, chip, hall });
})();
