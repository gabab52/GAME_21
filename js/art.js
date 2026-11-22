/*
 * Art — every sprite is drawn procedurally with canvas paths (flat colours + a dark outline).
 * Functions draw around the origin, facing +x, with y = 0 at the feet. Callers translate/flip.
 */
(function () {
  const Q = (globalThis.Q = globalThis.Q || {});
  const U = Q.U;

  const OUT = '#1c2033';
  const SKIN = '#eab491';
  const SKIN_D = '#d99a76';
  const HAIR = '#7a4a2a';
  const TEE = '#dcdcd7';
  const TEE_D = '#c3c3bd';
  const JEANS = '#2c3a66';
  const SHOE = '#8a5a35';

  // ------------------------------------------------------------------ primitives
  function rr(ctx, x, y, w, h, r) {
    ctx.beginPath();
    if (ctx.roundRect) ctx.roundRect(x, y, w, h, r);
    else ctx.rect(x, y, w, h);
  }
  function ell(ctx, x, y, rx, ry, rot) {
    ctx.beginPath();
    ctx.ellipse(x, y, Math.max(0.01, rx), Math.max(0.01, ry), rot || 0, 0, Math.PI * 2);
  }
  function fs(ctx, fill, lw) { // fill current path, then outline it
    ctx.fillStyle = fill; ctx.fill();
    ctx.lineWidth = lw == null ? 2.2 : lw; ctx.strokeStyle = OUT; ctx.lineJoin = 'round'; ctx.stroke();
  }
  function limb(ctx, pts, lw, col) { // outlined polyline
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(pts[0].x, pts[0].y); for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
    ctx.strokeStyle = OUT; ctx.lineWidth = lw + 3.2; ctx.stroke();
    ctx.strokeStyle = col; ctx.lineWidth = lw; ctx.stroke();
  }
  /** two-bone IK: returns the middle joint. dir = +1 bends toward the left-hand normal. */
  function ik(a, b, l1, l2, dir) {
    let dx = b.x - a.x, dy = b.y - a.y;
    let d = Math.hypot(dx, dy) || 0.001;
    const max = l1 + l2 - 0.05;
    if (d > max) { dx = (dx / d) * max; dy = (dy / d) * max; d = max; }
    const aa = (l1 * l1 - l2 * l2 + d * d) / (2 * d);
    const h = Math.sqrt(Math.max(0, l1 * l1 - aa * aa));
    return { x: a.x + (dx * aa) / d + (dy / d) * h * dir, y: a.y + (dy * aa) / d - (dx / d) * h * dir, end: { x: a.x + dx, y: a.y + dy } };
  }
  function star(ctx, x, y, r, rot) {
    ctx.beginPath();
    for (let i = 0; i < 10; i++) {
      const a = rot + (i * Math.PI) / 5 - Math.PI / 2, rad = i % 2 ? r * 0.45 : r;
      ctx.lineTo(x + Math.cos(a) * rad, y + Math.sin(a) * rad);
    }
    ctx.closePath();
  }

  // ------------------------------------------------------------------ hero head
  // Modelled on the reference photo: oval face with a defined jaw, short brown stubble (cheeks, moustache, chin),
  // wavy brown hair that covers the ears with a swept fringe, calm dark-brown eyes, a straight nose, a closed half-smile,
  // and the black pillbox cap with its white Greek-key band.
  const HAIR_L = '#9a6a45';
  const STUBBLE = 'rgba(74,47,30,0.74)';
  function blob(ctx, paths, color, lw) { // several overlapping shapes drawn as ONE outlined silhouette
    ctx.lineJoin = 'round'; ctx.strokeStyle = OUT; ctx.lineWidth = lw || 4;
    paths.forEach((p) => { p(); ctx.stroke(); });
    ctx.fillStyle = color;
    paths.forEach((p) => { p(); ctx.fill(); });
  }
  function drawHead(ctx, o) {
    // o: expr, helmet(bool), blink.   Head centre = (0,0), facing +x, about 27px tall.
    const expr = o.expr || 'normal';
    const circ = (x, y, r) => () => { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); };
    const face = () => {
      ctx.beginPath(); ctx.moveTo(-9, -9);
      ctx.bezierCurveTo(-11.5, -1, -10.5, 7, -5.5, 11.8);
      ctx.bezierCurveTo(-2, 15, 4.5, 14.8, 7.5, 11.5);
      ctx.bezierCurveTo(10.5, 8.2, 11.2, 4, 11.2, 0.5);
      ctx.bezierCurveTo(11.2, -5, 8.5, -9.5, 1.5, -10);
      ctx.closePath();
    };

    // ---- hair mass behind the head: wavy, falls over the ears to the jaw
    if (!o.helmet) {
      blob(ctx, [circ(-11.8, -5, 4.2), circ(-13, 1.2, 4), circ(-11.6, 6.6, 3.7), circ(-8, 10.6, 3.1), circ(-5, -10.5, 4.8), () => { ctx.beginPath(); ctx.ellipse(-6, 0, 8.6, 11.4, 0, 0, 7); }], HAIR, 3.4);
    } else {
      blob(ctx, [circ(-11.5, 8.5, 3.6), circ(-9, 11.5, 3.2)], HAIR, 3.4); // just the nape peeking out under the helmet
    }

    // ---- face
    face(); fs(ctx, SKIN, 2.2);
    // stubble: cheeks (sideburn → moustache), chin, jaw
    ctx.save(); face(); ctx.clip();
    ctx.fillStyle = STUBBLE;
    ctx.beginPath(); ctx.moveTo(-12, -3); ctx.lineTo(-8, -2); ctx.quadraticCurveTo(-3, 2.5, 2.2, 4.2); ctx.lineTo(12, 3.2); ctx.lineTo(12, 17); ctx.lineTo(-12, 17); ctx.closePath(); ctx.fill();
    ctx.fillStyle = 'rgba(36,22,14,0.55)';
    for (let i = 0; i < 38; i++) ctx.fillRect(-9 + ((i * 37) % 20) * 1.02, 4.2 + ((i * 23) % 11) * 0.95, 0.9, 0.9);
    ctx.fillStyle = 'rgba(190,140,105,0.28)'; // lighter specks: it's stubble, not a full beard
    for (let i = 0; i < 14; i++) ctx.fillRect(-8 + ((i * 29) % 19), 5 + ((i * 17) % 9), 0.9, 0.9);
    ctx.restore();

    // ---- nose (straight, a bit prominent) with nostril
    ell(ctx, 11.7, 2.4, 2.7, 2.8); fs(ctx, '#e2a583', 1.5);
    ctx.fillStyle = '#7a4a35'; ctx.beginPath(); ctx.ellipse(12.2, 3.8, 0.9, 0.6, 0, 0, 7); ctx.fill();
    ctx.strokeStyle = 'rgba(150,90,60,0.5)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(9.6, -3.2); ctx.quadraticCurveTo(10.8, -0.5, 10.4, 1.4); ctx.stroke();

    // ---- eyes: dark brown, calm
    const ex = [3, 8.3], ey = 0;
    ctx.fillStyle = 'rgba(120,70,50,0.16)'; ex.forEach((x) => { ctx.beginPath(); ctx.ellipse(x, ey + 3.4, 2.8, 0.9, 0, 0, 7); ctx.fill(); }); // faint eye bags
    if (expr === 'happy') {
      ctx.strokeStyle = '#2d1a0e'; ctx.lineWidth = 1.9; ctx.lineCap = 'round';
      ex.forEach((x) => { ctx.beginPath(); ctx.arc(x, ey + 1.2, 2.3, Math.PI * 1.1, Math.PI * 1.9); ctx.stroke(); });
    } else if (expr === 'hurt') {
      ctx.strokeStyle = '#2d1a0e'; ctx.lineWidth = 1.9; ctx.lineCap = 'round';
      ex.forEach((x) => { ctx.beginPath(); ctx.moveTo(x - 2.2, ey - 2); ctx.lineTo(x + 1.6, ey); ctx.lineTo(x - 2.2, ey + 2); ctx.stroke(); });
    } else if (expr === 'dead') {
      ctx.strokeStyle = '#2d1a0e'; ctx.lineWidth = 1.8; ctx.lineCap = 'round';
      ex.forEach((x) => { ctx.beginPath(); ctx.moveTo(x - 2, ey - 2); ctx.lineTo(x + 2, ey + 2); ctx.moveTo(x + 2, ey - 2); ctx.lineTo(x - 2, ey + 2); ctx.stroke(); });
    } else {
      const big = expr === 'shout' ? 1.2 : 1;
      ex.forEach((x) => {
        if (o.blink) { ctx.strokeStyle = '#2d1a0e'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(x - 2.4, ey + 0.5); ctx.lineTo(x + 2.4, ey + 0.5); ctx.stroke(); return; }
        ell(ctx, x, ey, 2.5 * big, 2.7 * big); ctx.fillStyle = '#fbf5ee'; ctx.fill();
        ctx.fillStyle = '#3b2415'; ctx.beginPath(); ctx.arc(x + 0.6, ey + 0.2, 1.95 * big, 0, 7); ctx.fill();
        ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.arc(x + 1.3, ey - 0.6, 0.55, 0, 7); ctx.fill();
        ctx.strokeStyle = '#2a170c'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';      // upper lid
        ctx.beginPath(); ctx.arc(x, ey + 0.4, 2.7 * big, Math.PI * 1.08, Math.PI * 1.92); ctx.stroke();
      });
    }
    // brows: thick, brown
    const bi = expr === 'focus' ? 1.2 : expr === 'shout' ? 1.0 : expr === 'hurt' ? -1.6 : expr === 'happy' ? -1.4 : -0.4;
    ctx.strokeStyle = '#4a2c17'; ctx.lineWidth = 1.9; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(0.4, -3.7 - bi * 0.3); ctx.quadraticCurveTo(2.8, -5.4 + bi * 0.3, 5.4, -4.5 + bi);
    ctx.moveTo(6.6, -4.5 + bi); ctx.quadraticCurveTo(8.8, -5.5 + bi * 0.3, 11, -4 - bi * 0.3); ctx.stroke();

    // ---- mouth: closed, slightly lopsided smile in the stubble
    ctx.lineCap = 'round';
    if (expr === 'normal') {
      ctx.fillStyle = 'rgba(190,125,100,0.8)'; ctx.beginPath(); ctx.ellipse(7.8, 9.3, 3, 1.1, 0, 0, 7); ctx.fill();   // lower lip shows through the stubble
      ctx.strokeStyle = '#3a2014'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(4.2, 7.9); ctx.quadraticCurveTo(7.8, 9.2, 11, 6.8); ctx.stroke();
    } else if (expr === 'focus') { ctx.strokeStyle = '#3a2014'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(4.2, 8); ctx.lineTo(10.4, 7.8); ctx.stroke(); }
    else if (expr === 'happy') { ctx.beginPath(); ctx.moveTo(3.6, 6.6); ctx.quadraticCurveTo(7.6, 13.4, 11.6, 6.4); ctx.closePath(); fs(ctx, '#5a1f1f', 1.4); ctx.fillStyle = '#fff'; ctx.fillRect(4.8, 6.7, 5.8, 1.5); }
    else if (expr === 'shout') { ell(ctx, 7.8, 9, 3.6, 4.4); fs(ctx, '#4a1515', 1.4); ell(ctx, 7.8, 11, 2.2, 1.6); ctx.fillStyle = '#e8737f'; ctx.fill(); }
    else if (expr === 'hurt') { ctx.strokeStyle = '#3a2014'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(3.6, 9.4); ctx.quadraticCurveTo(5.6, 6.6, 7.6, 9.4); ctx.quadraticCurveTo(9.6, 11.8, 11.6, 8.8); ctx.stroke(); }
    else if (expr === 'dead') { ell(ctx, 7.8, 9.2, 2.2, 3); fs(ctx, '#4a1515', 1.3); }

    if (o.helmet) {
      // light-grey scooter helmet with chin strap (as in the photo)
      ctx.beginPath();
      ctx.moveTo(-13.5, -1); ctx.bezierCurveTo(-15, -17, -2, -22, 6, -20.5); ctx.bezierCurveTo(13, -19, 14.5, -11, 14, -5.5);
      ctx.lineTo(-1.5, -6.5); ctx.lineTo(-1, 4); ctx.lineTo(-6.5, 5.5); ctx.bezierCurveTo(-12, 5, -13.5, 2, -13.5, -1);
      ctx.closePath(); fs(ctx, '#c6d1de');
      ctx.strokeStyle = 'rgba(255,255,255,0.75)'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(-8, -14); ctx.quadraticCurveTo(-2, -18.5, 5, -17.5); ctx.stroke();
      ctx.strokeStyle = OUT; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-5, 4); ctx.quadraticCurveTo(3, 15, 9, 11); ctx.stroke(); // chin strap
      return;
    }

    // ---- hair in front: swept fringe + the side lock over the ear
    ctx.beginPath();
    ctx.moveTo(-13.4, -11); ctx.lineTo(-13.4, -3);
    ctx.quadraticCurveTo(-10, -8.2, -6, -5.4); ctx.quadraticCurveTo(-3, -3.4, 0.6, -6.6);
    ctx.quadraticCurveTo(4, -8.4, 7.4, -5.6); ctx.quadraticCurveTo(9.6, -4.4, 11.6, -7.4); ctx.lineTo(11.6, -11); ctx.closePath();
    fs(ctx, HAIR, 1.9);
    ctx.beginPath();
    ctx.moveTo(-12.4, -5); ctx.bezierCurveTo(-8.4, -3.8, -7.4, 0.6, -8.8, 4.2); ctx.bezierCurveTo(-9.4, 5.8, -11.2, 5.8, -12, 3.6); ctx.closePath();
    fs(ctx, HAIR, 1.3);
    ctx.strokeStyle = HAIR_L; ctx.lineWidth = 1; ctx.lineCap = 'round'; // lighter strands: the hair is wavy, not flat
    ctx.beginPath();
    ctx.moveTo(-9.6, -7.2); ctx.quadraticCurveTo(-7.6, -6.6, -5.6, -5.8);
    ctx.moveTo(-1.6, -7.4); ctx.quadraticCurveTo(0.6, -8.4, 2.4, -7.9);
    ctx.moveTo(4.6, -7.6); ctx.quadraticCurveTo(6.4, -7.2, 8, -6.4);
    ctx.moveTo(-10.4, -1.5); ctx.quadraticCurveTo(-9, 1.5, -9.4, 4.2);
    ctx.stroke();

    // ---- black pillbox cap, white Greek-key band, tilted a little
    ctx.save(); ctx.translate(-0.4, -9.2); ctx.rotate(-0.08);
    ctx.beginPath(); ctx.moveTo(-11.2, 0); ctx.lineTo(-12.2, -8.6); ctx.quadraticCurveTo(0, -11.4, 11.4, -9.4); ctx.lineTo(10.6, -0.4); ctx.quadraticCurveTo(0, 1.2, -11.2, 0); ctx.closePath();
    fs(ctx, '#17171d', 2.1);
    ctx.fillStyle = '#fff'; ctx.fillRect(-11.6, -5.2, 22.2, 2.7);                    // band
    ctx.fillRect(-11.8, -1.5, 22.4, 0.8);                                             // thin rule under the band
    ctx.fillStyle = '#17171d';                                                        // Greek-key notches cut into the band
    for (let i = 0; i < 8; i++) { const x = -11 + i * 2.8; ctx.fillRect(x, -4.7, 1.4, 1.0); ctx.fillRect(x + 1.2, -3.6, 1.4, 0.8); }
    ctx.fillStyle = '#fff';                                                           // dots + a swirl on the crown
    [[-7, -8], [-2.6, -8.6], [1.8, -8.9], [6, -8.6]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 0.7, 0, 7); ctx.fill(); });
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 0.9; ctx.beginPath(); ctx.arc(8.2, -7.6, 1.4, 0.4, 4.6); ctx.stroke();
    ctx.restore();
  }

  // ------------------------------------------------------------------ hero (on foot / skis / sword)
  /**
   * s = { t, mode:'run'|'skis'|'sword', air, vy, expr, blink, throwP (0..1 or -1), raise (0..1) }
   */
  function hero(ctx, s) {
    const t = s.t, mode = s.mode;
    const skis = mode === 'skis';
    const ph = skis ? 0 : t * (s.runRate || 13);
    const sw = Math.sin(ph);
    const bob = !s.air && !skis ? Math.abs(Math.cos(ph)) * 2.2 : 0;
    let hipY, lean, bf, ff;
    if (skis) {
      hipY = -15 - Math.sin(t * 5) * 0.8; lean = 0.4 + (s.air ? -0.1 : 0);
      bf = { x: -10, y: -4 }; ff = { x: 9, y: -4 };
    } else if (s.air) {
      hipY = -19; lean = 0.06 + U.clamp(s.vy / 2400, -0.1, 0.16);
      if (s.vy < 0) { bf = { x: -10, y: -9 }; ff = { x: 9, y: -14 }; } else { bf = { x: -7, y: -4 }; ff = { x: 10, y: -8 }; }
    } else {
      hipY = -14 - bob; lean = 0.1;
      const l = (p) => ({ x: Math.sin(p) * 11.5, y: -Math.max(0, Math.cos(p)) * 5.5 });
      bf = l(ph + Math.PI); ff = l(ph);
    }
    const hip = { x: 0, y: hipY };

    ctx.save();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    // skis (under everything)
    if (skis) {
      const plank = (dx, front) => {
        ctx.save(); ctx.translate(dx, 0);
        ctx.beginPath(); ctx.moveTo(-26, -4); ctx.lineTo(26, -4); ctx.quadraticCurveTo(36, -4, 40, -10); ctx.lineTo(34, -1.5); ctx.quadraticCurveTo(30, 0, 24, 0); ctx.lineTo(-26, 0); ctx.closePath();
        fs(ctx, front ? '#e63946' : '#c42f3c', 2);
        ctx.fillStyle = '#fff'; ctx.fillRect(-10, -3.2, 18, 1.6);
        ctx.restore();
      };
      plank(-2, false);
    }

    // scarf (skis) flapping behind
    const scarf = () => {
      ctx.save(); ctx.translate(hip.x, hip.y); ctx.rotate(lean);
      const w = Math.sin(t * 14) * 3;
      ctx.beginPath(); ctx.moveTo(-2, -21); ctx.quadraticCurveTo(-14, -22 + w, -26, -17 - w); ctx.lineTo(-26, -12 - w); ctx.quadraticCurveTo(-14, -16 + w, -2, -15.5); ctx.closePath();
      fs(ctx, '#e63946', 1.8); ctx.restore();
    };

    // --- back arm, back leg
    const shoulder = { x: 1, y: -18 };
    const armPose = (back) => {
      let a1, a2;
      if (s.raise > 0) { const k = s.raise; a1 = (back ? 3.62 : 2.66) + Math.sin(t * 22) * 0.12 * k; a2 = a1 + (back ? 0.1 : -0.1); }
      else if (skis) { a1 = back ? -0.9 : 0.5; a2 = back ? -0.5 : 0.95; }
      else if (s.air) { a1 = back ? -1.1 : 1.05; a2 = a1 + (back ? -0.3 : 0.5); }
      else { a1 = (back ? 1 : -1) * sw * 0.95; a2 = a1 + 1.05; if (back) a2 = a1 + 0.6; }
      return [a1, a2];
    };
    const drawArm = (back, pose) => {
      const [a1, a2] = pose;
      const el = { x: shoulder.x + Math.sin(a1) * 8.5, y: shoulder.y + Math.cos(a1) * 8.5 };
      const hd = { x: el.x + Math.sin(a2) * 8.5, y: el.y + Math.cos(a2) * 8.5 };
      limb(ctx, [shoulder, el], 6.6, TEE);
      limb(ctx, [el, hd], 5, SKIN);
      ctx.beginPath(); ctx.arc(hd.x, hd.y, 3, 0, 7); fs(ctx, SKIN, 1.6);
      return hd;
    };
    const legs = (foot, kneeDir) => {
      const k = ik(hip, foot, 9.2, 9.2, kneeDir);
      limb(ctx, [hip, k, k.end], 7, JEANS);
      ell(ctx, k.end.x + 2, k.end.y - 0.5, 6, 3.6, skis ? 0 : -0.05); fs(ctx, SHOE, 1.8);
    };

    ctx.save(); ctx.translate(0, 0);
    // back limbs
    if (skis) scarf();
    legs(bf, 1);
    const backPose = armPose(true);
    ctx.save(); ctx.translate(hip.x, hip.y); ctx.rotate(lean); drawArm(true, backPose); ctx.restore();

    // torso
    ctx.save(); ctx.translate(hip.x, hip.y); ctx.rotate(lean);
    rr(ctx, -9.5, -20, 19, 23, 6.5); fs(ctx, TEE);
    ctx.fillStyle = TEE_D;
    [[-5, -12], [2, -8], [-2, -2], [5, -15], [-6, -5], [6, -3], [0, -16]].forEach(([x, y]) => ctx.fillRect(x, y, 1.3, 1.3));
    ctx.strokeStyle = TEE_D; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.arc(2.5, -19.5, 5, 0.15, Math.PI - 0.15); ctx.stroke(); // crew neck
    ctx.restore();

    legs(ff, 1);

    // Matita power-up: a pencil sticks out of the hips, perpendicular to the body
    if (s.pencil && !skis) {
      ctx.save(); ctx.translate(hip.x + 3, hip.y + 0.5); ctx.rotate(lean * 0.4 - 0.04 + Math.sin(t * 13) * 0.025);
      Art.pencil(ctx, 44, t); ctx.restore();
    }

    // head
    ctx.save(); ctx.translate(hip.x, hip.y); ctx.rotate(lean);
    ctx.translate(3, -31.5 - (s.expr === 'shout' ? 1 : 0)); ctx.rotate(-lean * 0.8 + Math.sin(ph * 2) * 0.03);
    drawHead(ctx, { expr: s.expr, blink: s.blink });
    ctx.restore();

    // front arm (+ held items)
    ctx.save(); ctx.translate(hip.x, hip.y); ctx.rotate(lean);
    let fp = armPose(false);
    if (mode === 'sword') {
      const sa = 2.25 + Math.sin(t * 9) * 0.22; fp = [1.9 + Math.sin(t * 9) * 0.15, sa];
    }
    if (s.throwP != null && s.throwP >= 0) { const p = U.clamp(s.throwP, 0, 1); const a = U.lerp(-1.5, 1.7, U.smooth(p)); fp = [a, a + (1 - p) * -0.7 + 0.1]; }
    const hand = drawArm(false, fp);
    if (mode === 'sword') {
      ctx.save(); ctx.translate(hand.x, hand.y); ctx.rotate(Math.PI / 2 - fp[1]);
      Art.sword(ctx, 54, 1, t); ctx.restore();
    }
    if (skis) { // poles
      ctx.save(); ctx.translate(hand.x, hand.y);
      ctx.strokeStyle = OUT; ctx.lineWidth = 3.4; ctx.lineCap = 'round'; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-22, 22); ctx.stroke();
      ctx.strokeStyle = '#8895a8'; ctx.lineWidth = 1.6; ctx.beginPath(); ctx.moveTo(0, 0); ctx.lineTo(-22, 22); ctx.stroke();
      ctx.restore();
    }
    ctx.restore();
    if (skis) {
      ctx.save(); // near ski on top
      ctx.translate(2, 0);
      ctx.beginPath(); ctx.moveTo(-26, -4); ctx.lineTo(26, -4); ctx.quadraticCurveTo(36, -4, 40, -10); ctx.lineTo(34, -1.5); ctx.quadraticCurveTo(30, 0, 24, 0); ctx.lineTo(-26, 0); ctx.closePath();
      fs(ctx, '#ff4d5e', 2); ctx.fillStyle = '#fff'; ctx.fillRect(-10, -3.2, 18, 1.6);
      ctx.restore();
    }
    ctx.restore();
    ctx.restore();
  }

  // ------------------------------------------------------------------ hero on the Vespa
  function wheel(ctx, x, y, r, rot) {
    ctx.beginPath(); ctx.arc(x, y, r, 0, 7); fs(ctx, '#2a2d38', 2.2);
    ctx.beginPath(); ctx.arc(x, y, r * 0.52, 0, 7); fs(ctx, '#aeb6c4', 1.6);
    ctx.strokeStyle = '#6f7788'; ctx.lineWidth = 1.5;
    for (let i = 0; i < 3; i++) { const a = rot + (i * Math.PI) / 3; ctx.beginPath(); ctx.moveTo(x + Math.cos(a) * r * 0.5, y + Math.sin(a) * r * 0.5); ctx.lineTo(x - Math.cos(a) * r * 0.5, y - Math.sin(a) * r * 0.5); ctx.stroke(); }
  }
  /** s = { t, speed, expr, throwP, raise } — rider + white Vespa, wheels touch y=0 */
  function bike(ctx, s) {
    const t = s.t, rot = t * 18;
    const shake = Math.sin(t * 40) * 0.45;
    ctx.save(); ctx.translate(0, shake); ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    wheel(ctx, -27, -11, 11, rot);
    // exhaust
    rr(ctx, -46, -17, 10, 6, 3); fs(ctx, '#3a3f4d', 1.8);

    // rider: backpack + torso + leg (behind the shield)
    const hip = { x: -13, y: -41 };
    rr(ctx, -25, -62, 11, 22, 5); fs(ctx, '#23252f', 2); // black backpack
    // leg
    const foot = { x: 5, y: -20 };
    const k = ik(hip, foot, 14, 14, 1);
    limb(ctx, [hip, k, k.end], 8, JEANS);
    ell(ctx, foot.x + 3, foot.y - 1, 7, 4, 0); fs(ctx, SHOE, 1.8);

    // rear cowl + seat
    ctx.beginPath();
    ctx.moveTo(-42, -13); ctx.quadraticCurveTo(-46, -36, -26, -40); ctx.lineTo(-8, -38); ctx.quadraticCurveTo(-1, -30, -3, -17); ctx.lineTo(-6, -12); ctx.closePath();
    fs(ctx, '#f6f2e8', 2.2);
    ctx.strokeStyle = 'rgba(0,0,0,0.12)'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(-34, -30); ctx.lineTo(-12, -28); ctx.stroke();
    rr(ctx, -32, -45, 28, 7.5, 3.4); fs(ctx, '#27324f', 2);
    // floorboard
    rr(ctx, -6, -17, 24, 6, 2.5); fs(ctx, '#e1dccd', 1.8);

    // torso (leaning slightly forward)
    ctx.save(); ctx.translate(hip.x, hip.y); ctx.rotate(0.1);
    rr(ctx, -9, -24, 18, 28, 6.5); fs(ctx, '#9fa9b9');
    ctx.strokeStyle = 'rgba(40,50,70,0.35)'; ctx.lineWidth = 1.3; ctx.beginPath(); ctx.moveTo(1, -22); ctx.lineTo(1, 2); ctx.stroke();
    ctx.fillStyle = '#7e8999'; [-14, -8, -2].forEach((y) => ctx.fillRect(0.3, y, 1.5, 1.5));
    ctx.beginPath(); ctx.moveTo(-3, -24); ctx.lineTo(3, -19); ctx.lineTo(8, -24); ctx.strokeStyle = '#7e8999'; ctx.stroke(); // collar
    // backpack strap
    ctx.strokeStyle = '#23252f'; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(-5, -23); ctx.lineTo(-4, -2); ctx.stroke();
    ctx.restore();

    // head
    ctx.save(); ctx.translate(-7, -73); ctx.rotate(0.06);
    drawHead(ctx, { expr: s.expr || 'happy', helmet: true });
    ctx.restore();

    // front: leg shield, fender, handlebar
    ctx.beginPath();
    ctx.moveTo(6, -12); ctx.quadraticCurveTo(10, -30, 13, -48); ctx.lineTo(25, -52); ctx.quadraticCurveTo(26, -34, 30, -22); ctx.lineTo(36, -13); ctx.closePath();
    fs(ctx, '#f6f2e8', 2.2);
    ctx.fillStyle = '#d94f4f'; ctx.beginPath(); ctx.arc(17, -34, 3.6, 0, 7); ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = '#ffd166'; ctx.beginPath(); ctx.arc(17, -34, 1.5, 0, 7); ctx.fill();
    ctx.strokeStyle = OUT; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(29, -34); ctx.lineTo(31, -11); ctx.stroke();
    wheel(ctx, 31, -11, 11, rot);
    ctx.beginPath(); ctx.moveTo(22, -17); ctx.quadraticCurveTo(32, -34, 45, -17); ctx.lineTo(41, -15); ctx.quadraticCurveTo(32, -26, 26, -14); ctx.closePath(); fs(ctx, '#f6f2e8', 2);
    rr(ctx, 11, -58, 15, 7, 3); fs(ctx, '#3a3f4d', 1.8);
    ctx.beginPath(); ctx.arc(26, -56, 6, 0, 7); fs(ctx, '#fff6c2', 2);
    ctx.fillStyle = 'rgba(255,246,194,0.9)'; ctx.beginPath(); ctx.arc(26, -56, 3, 0, 7); ctx.fill();

    // arm to the handlebar (in front of the shield top)
    const sh = { x: -10, y: -62 }, hd = { x: 16, y: -54 };
    let handP = hd;
    if (s.throwP != null && s.throwP >= 0) { const p = U.smooth(U.clamp(s.throwP, 0, 1)); handP = { x: U.lerp(-6, 34, p), y: U.lerp(-48, -68, p) }; }
    if (s.raise > 0) handP = { x: 4, y: -96 + Math.sin(t * 20) * 2 };
    const el = ik(sh, handP, 13.5, 13.5, -1);
    limb(ctx, [sh, el, el.end], 6.2, '#9fa9b9');
    ctx.beginPath(); ctx.arc(el.end.x, el.end.y, 3.2, 0, 7); fs(ctx, SKIN, 1.6);
    ctx.restore();
  }

  // ------------------------------------------------------------------ sword
  function sword(ctx, len, glow, t) {
    ctx.save();
    if (glow) {
      const pulse = 0.28 + Math.sin(t * 10) * 0.08;
      ctx.fillStyle = `rgba(255,209,102,${pulse})`;
      ctx.beginPath(); ctx.moveTo(4, -9); ctx.lineTo(len - 6, -8); ctx.lineTo(len + 8, 0); ctx.lineTo(len - 6, 8); ctx.lineTo(4, 9); ctx.closePath(); ctx.fill();
    }
    rr(ctx, -8, -2.6, 12, 5.2, 2); fs(ctx, '#7a4a2a', 1.8);            // grip
    rr(ctx, 3, -8, 5, 16, 2); fs(ctx, '#ffd166', 1.8);                  // guard
    ctx.beginPath(); ctx.moveTo(8, -3.6); ctx.lineTo(len - 9, -3.6); ctx.lineTo(len, 0); ctx.lineTo(len - 9, 3.6); ctx.lineTo(8, 3.6); ctx.closePath(); fs(ctx, '#eef3fb', 1.8);
    ctx.strokeStyle = '#a9b8cf'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(10, 0); ctx.lineTo(len - 12, 0); ctx.stroke();
    ctx.fillStyle = '#ff6b6b'; ctx.beginPath(); ctx.arc(-9, 0, 2.3, 0, 7); ctx.fill();
    ctx.restore();
  }

  // ------------------------------------------------------------------ pencil (power-up)
  /** A yellow pencil lying along +x: eraser at x=0, sharpened graphite tip at x=len. */
  function pencil(ctx, len, t) {
    ctx.save(); ctx.lineJoin = 'round'; ctx.lineCap = 'round';
    const bodyEnd = len - 9;
    rr(ctx, -1, -3, 7, 6, 2); fs(ctx, '#ff8fa3', 1.6);                         // eraser
    ctx.beginPath(); ctx.rect(5, -3.1, 5, 6.2); fs(ctx, '#b8c0cc', 1.5);        // ferrule
    ctx.strokeStyle = 'rgba(40,50,70,0.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.moveTo(7, -3); ctx.lineTo(7, 3); ctx.moveTo(8.8, -3); ctx.lineTo(8.8, 3); ctx.stroke();
    ctx.beginPath(); ctx.rect(10, -3.1, bodyEnd - 10, 6.2); fs(ctx, '#ffd23f', 1.6); // body
    ctx.fillStyle = '#ffeb8a'; ctx.fillRect(10.6, -2.2, bodyEnd - 11.2, 1.5);
    ctx.fillStyle = '#e0a800'; ctx.fillRect(10.6, 1.2, bodyEnd - 11.2, 1.4);
    ctx.beginPath(); ctx.moveTo(bodyEnd, -3.1); ctx.lineTo(len, 0); ctx.lineTo(bodyEnd, 3.1); ctx.closePath(); fs(ctx, '#f2c999', 1.6); // sharpened wood
    ctx.beginPath(); ctx.moveTo(len - 3.6, -1.15); ctx.lineTo(len + 0.6, 0); ctx.lineTo(len - 3.6, 1.15); ctx.closePath(); fs(ctx, '#2b2f3f', 1.1); // graphite
    ctx.restore();
  }

  // ------------------------------------------------------------------ RSE meteorite
  /** The rock, ~54px across, centred. The "RSE" lettering stays upright (the renderer only wobbles it a little). */
  function meteor(ctx, t) {
    ctx.save(); ctx.lineJoin = 'round';
    const R = 27, n = 13;
    const shape = () => {
      ctx.beginPath();
      for (let i = 0; i < n; i++) {
        const a = (i / n) * Math.PI * 2, r = R * (0.88 + 0.12 * Math.sin(i * 2.7 + 0.6));
        const x = Math.cos(a) * r, y = Math.sin(a) * r; i ? ctx.lineTo(x, y) : ctx.moveTo(x, y);
      }
      ctx.closePath();
    };
    // heat glow
    const glow = 0.45 + Math.sin(t * 18) * 0.12;
    const gg = ctx.createRadialGradient(0, 0, R * 0.7, 0, 0, R * 1.55);
    gg.addColorStop(0, `rgba(255,140,40,${glow})`); gg.addColorStop(1, 'rgba(255,90,20,0)');
    ctx.fillStyle = gg; ctx.beginPath(); ctx.arc(0, 0, R * 1.55, 0, 7); ctx.fill();
    shape();
    const g = ctx.createRadialGradient(-9, -10, 3, 0, 0, R);
    g.addColorStop(0, '#9b8068'); g.addColorStop(0.65, '#5f4a3a'); g.addColorStop(1, '#3a2a22');
    ctx.fillStyle = g; ctx.fill(); ctx.lineWidth = 3; ctx.strokeStyle = OUT; ctx.stroke();
    ctx.save(); shape(); ctx.clip();
    ctx.fillStyle = 'rgba(0,0,0,0.22)';
    [[-13, -11, 5.5], [13, -15, 3.8], [15, 11, 5], [-15, 13, 3.4], [2, 20, 3]].forEach(([x, y, r]) => { ctx.beginPath(); ctx.arc(x, y, r, 0, 7); ctx.fill(); });
    ctx.strokeStyle = '#ff9a3d'; ctx.lineWidth = 1.7; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-26, 4); ctx.lineTo(-17, 8); ctx.lineTo(-13, 17); ctx.moveTo(26, -4); ctx.lineTo(18, -9); ctx.lineTo(15, -19); ctx.moveTo(-4, -27); ctx.lineTo(-1, -19); ctx.lineTo(6, -16); ctx.stroke();
    ctx.restore();
    ctx.font = '900 16px Bungee, Impact, "Arial Black", sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.save(); ctx.rotate(-0.06);
    ctx.lineWidth = 4.2; ctx.strokeStyle = OUT; ctx.strokeText('RSE', 0, 1);
    ctx.fillStyle = '#ffe08a'; ctx.fillText('RSE', 0, 1);
    ctx.restore();
    ctx.restore();
  }
  /** Flame tail along -x (the caller rotates so +x is the direction of travel). */
  function meteorTrail(ctx, t) {
    ctx.save();
    [[118, 23, 'rgba(255,70,30,0.55)'], [86, 17, 'rgba(255,140,40,0.75)'], [56, 11, 'rgba(255,230,140,0.9)']].forEach(([len, w, col], i) => {
      const fl = Math.sin(t * 30 + i * 2) * 6;
      ctx.fillStyle = col; ctx.beginPath(); ctx.moveTo(0, -w);
      ctx.bezierCurveTo(-len * 0.4, -w * 1.15, -len * 0.8, -w * 0.5, -len, fl);
      ctx.bezierCurveTo(-len * 0.8, w * 0.5, -len * 0.4, w * 1.15, 0, w); ctx.closePath(); ctx.fill();
    });
    ctx.restore();
  }

  // ------------------------------------------------------------------ Francone (faces +x; caller flips)
  // Old, tall and lanky (~105px, 1.5x the hero): long skinny legs, a thin stooped torso in a cardigan, a long white beard
  // and big black glasses. Red eyes glow behind the lenses when he winds up / lunges.
  /** s = { t, state } */
  function oldman(ctx, s) {
    const t = s.t, st = s.state;
    const walking = st === 'enter' || st === 'return' || st === 'stalk' || st === 'leave';
    const sh = walking ? Math.sin(t * (st === 'stalk' ? 5 : 11)) : 0;
    const lunging = st === 'lunge';
    const winding = st === 'windup';
    const stun = st === 'stun';
    const dead = st === 'dead';
    const lean = lunging ? 0.5 : winding ? -0.14 : stun ? -0.22 : 0.2 + Math.sin(t * 2) * 0.03;
    const jaw = lunging ? 1 : winding ? 0.55 + Math.sin(t * 40) * 0.25 : stun ? 0.6 : 0;
    const quake = winding ? Math.sin(t * 60) * 1.8 : 0;
    const HIP = -46;
    const TROUSER = '#6d7184', CARD = '#8c5a3c', CREAM = '#e7dfc7', SKIN_O = '#efb7a0', WHITE = '#f6f5ef';
    ctx.save(); ctx.translate(quake, 0); ctx.lineCap = 'round'; ctx.lineJoin = 'round';

    // legs: long, thin trousers with a slight knee bend + slippers
    [0, 1].forEach((i) => {
      const x = i ? 7 - sh * 7 : -6 + sh * 7;
      const lift = walking ? Math.max(0, (i ? -sh : sh)) * 5 : lunging ? (i ? 6 : 0) : 0;
      const hipP = { x: x * 0.2, y: HIP + 3 }, foot = { x, y: -3 - lift };
      const k = ik(hipP, foot, 23, 23, 1);
      limb(ctx, [hipP, k, k.end], 6, i ? TROUSER : '#5b5f72');
      ell(ctx, foot.x + 3, foot.y - 1.2, 8, 3.6); fs(ctx, '#b5653d', 1.8);
    });

    ctx.save(); ctx.translate(0, HIP); ctx.rotate(lean);
    // long thin arms (reach changes with the state)
    const reach = lunging ? 1.52 : winding ? 2.2 : 0.7 + Math.sin(t * 4) * 0.1;
    const SHD = { x: 2, y: -31 };
    const arm = (a) => {
      const el = { x: SHD.x + Math.sin(a) * 14, y: SHD.y + Math.cos(a) * 14 };
      const hd = { x: el.x + Math.sin(a + 0.1) * 14, y: el.y + Math.cos(a + 0.1) * 14 };
      limb(ctx, [SHD, el], 6, CARD);
      limb(ctx, [el, hd], 4.2, SKIN_O);
      if (lunging || winding) { // claws
        ctx.strokeStyle = OUT; ctx.lineWidth = 1.8;
        for (let i = -1; i <= 1; i++) { ctx.beginPath(); ctx.moveTo(hd.x, hd.y); ctx.lineTo(hd.x + Math.sin(a + 0.1) * 7 + i * 3, hd.y + Math.cos(a + 0.1) * 7 + i * 2); ctx.stroke(); }
      } else { ctx.beginPath(); ctx.arc(hd.x, hd.y, 3, 0, 7); fs(ctx, SKIN_O, 1.6); }
      return hd;
    };
    arm(reach - 0.35);
    // cardigan: tall and narrow, cream shirt, buttons, little red bow tie
    rr(ctx, -8.5, -37, 17, 43, 7.5); fs(ctx, CARD);
    ctx.fillStyle = CREAM; ctx.beginPath(); ctx.moveTo(-2, -36); ctx.lineTo(6, -36); ctx.lineTo(2, -12); ctx.closePath(); ctx.fill();
    ctx.strokeStyle = '#6e4329'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(2, -36); ctx.lineTo(2, 5); ctx.stroke();
    ctx.fillStyle = CREAM; [-27, -19, -11, -3].forEach((y) => { ctx.beginPath(); ctx.arc(6, y, 1.7, 0, 7); ctx.fill(); });
    ctx.beginPath(); ctx.moveTo(3.5, -36); ctx.lineTo(-1.5, -40); ctx.lineTo(-1.5, -32); ctx.closePath(); fs(ctx, '#d94f4f', 1.4);
    ctx.beginPath(); ctx.moveTo(3.5, -36); ctx.lineTo(8.5, -40); ctx.lineTo(8.5, -32); ctx.closePath(); fs(ctx, '#d94f4f', 1.4);

    // head (long face)
    ctx.save(); ctx.translate(11, -48); ctx.rotate(-lean * 0.7 + (stun ? Math.sin(t * 18) * 0.15 : 0));
    // white wisps at the back
    ctx.beginPath(); ctx.arc(-8, -5, 4.6, 0, 7); fs(ctx, '#f4f2ea', 1.6);
    ctx.beginPath(); ctx.arc(-9, 3, 4.2, 0, 7); fs(ctx, '#f4f2ea', 1.6);
    ctx.beginPath(); ctx.arc(-4, -11, 3.6, 0, 7); fs(ctx, '#f4f2ea', 1.6);
    ell(ctx, 0, 0, 10.2, 12.8); fs(ctx, '#f0b9a0');           // bald, long head
    ctx.fillStyle = 'rgba(255,255,255,0.35)'; ell(ctx, -2.5, -8, 4.4, 2.2); ctx.fill();
    ell(ctx, -3, 2, 2.8, 3.4); fs(ctx, '#e7a58c', 1.4);       // ear
    // long pointy nose
    ell(ctx, 11.8, 3.2, 5.6, 4.2, 0.12); fs(ctx, '#e7907a', 1.8);
    // black glasses: dark lens, thick frame, temple arm to the ear
    const gl = stun ? 1.6 : 0;
    ctx.strokeStyle = '#0d0e15'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(3.6, -3.4 + gl); ctx.lineTo(-7.5, -4.6); ctx.stroke();
    rr(ctx, 3, -7.8 + gl, 13, 10.4, 4); fs(ctx, '#0f1018', 2.2);
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.fillRect(5.4, -5.6 + gl, 4.4, 1.5); ctx.fillRect(5.4, -3.4 + gl, 1.8, 1.2); // glint
    if (dead) {
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.7; ctx.beginPath(); ctx.moveTo(7, -5 + gl); ctx.lineTo(13, 0 + gl); ctx.moveTo(13, -5 + gl); ctx.lineTo(7, 0 + gl); ctx.stroke();
    } else if (winding || lunging) { // red eyes glow through the lens
      ctx.fillStyle = '#ff3b3b'; ctx.beginPath(); ctx.arc(12.2, -2.2 + gl, lunging ? 2.4 : 1.9, 0, 7); ctx.fill();
    }
    // bushy white brow
    ctx.strokeStyle = '#f4f2ea'; ctx.lineWidth = 3.4; ctx.beginPath(); ctx.moveTo(3, -11.2 - (winding ? 1 : 0)); ctx.lineTo(14, -8.6 + (winding || lunging ? 2.2 : 0)); ctx.stroke();
    ctx.strokeStyle = OUT; ctx.lineWidth = 0.8; ctx.stroke();
    // LONG white beard (hangs well below the chin)
    ctx.beginPath();
    ctx.moveTo(-6, 3); ctx.bezierCurveTo(-5, 16, -2, 27, 5, 37 + jaw * 3); ctx.bezierCurveTo(10, 30, 16, 24, 17.5, 14);
    ctx.bezierCurveTo(20, 12, 19.5, 9, 16, 8); ctx.lineTo(7, 6.5); ctx.bezierCurveTo(2, 6, -2, 3, -6, 3); ctx.closePath();
    fs(ctx, WHITE, 2.2);
    ctx.strokeStyle = '#cfcdbf'; ctx.lineWidth = 1.3;
    ctx.beginPath(); ctx.moveTo(2, 14); ctx.quadraticCurveTo(4, 24, 4, 32); ctx.moveTo(9, 15); ctx.quadraticCurveTo(10, 23, 8, 30); ctx.moveTo(13.5, 15); ctx.quadraticCurveTo(14, 20, 12.5, 24); ctx.stroke();
    // mouth (opens wide to eat you)
    if (jaw > 0) {
      ctx.save(); ell(ctx, 12.5, 13 + jaw * 2, 5.8, 2.4 + jaw * 5.4); fs(ctx, '#4a1515', 1.8);
      ctx.clip(); ctx.fillStyle = '#fff';
      for (let i = 0; i < 4; i++) { ctx.beginPath(); ctx.moveTo(7.5 + i * 3.2, 6); ctx.lineTo(9.5 + i * 3.2, 6); ctx.lineTo(8.5 + i * 3.2, 12); ctx.closePath(); ctx.fill(); }
      ctx.fillStyle = '#e8737f'; ell(ctx, 12, 19.5 + jaw * 2, 3.8, 3.1); ctx.fill();
      ctx.restore();
    } else {
      ctx.strokeStyle = '#8a8776'; ctx.lineWidth = 1.8; ctx.beginPath(); ctx.moveTo(9.5, 12.5); ctx.quadraticCurveTo(13.5, 14.5 + Math.sin(t * 6) * 1.2, 17.5, 11.5); ctx.stroke(); // grumbling
    }
    // moustache over the lip
    ell(ctx, 13.6, 8.8, 6.2, 2.5, 0.08); fs(ctx, WHITE, 1.6);
    // dizzy stars
    if (stun) { for (let i = 0; i < 3; i++) { const a = t * 6 + (i * Math.PI * 2) / 3; star(ctx, Math.cos(a) * 15, -22 + Math.sin(a) * 4, 4.2, a); fs(ctx, '#ffd166', 1.3); } }
    ctx.restore(); // head
    // front arm + cane
    const hd = arm(reach);
    if (!lunging && !winding && !dead) {
      ctx.strokeStyle = OUT; ctx.lineWidth = 5.4; ctx.beginPath(); ctx.moveTo(hd.x, hd.y - 6); ctx.lineTo(hd.x + 1, hd.y + 38); ctx.stroke();
      ctx.strokeStyle = '#b7824f'; ctx.lineWidth = 3; ctx.stroke();
    }
    ctx.restore(); // torso transform
    ctx.restore();
  }

  // ------------------------------------------------------------------ Figaro the cat (faces +x; caller flips)
  /** s = { t, state, flash, hiss } */
  function cat(ctx, s) {
    const t = s.t, st = s.state;
    const crouch = st === 'crouch';
    const leap = st === 'leap';
    const dead = st === 'dead';
    const ph = t * 20;
    const wig = crouch ? Math.sin(t * 38) * 2.2 : 0;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (leap) ctx.rotate(-0.3);
    const by = crouch ? -9 : leap ? -17 : -15 - Math.abs(Math.sin(ph)) * 2.2;

    // tail (black, curling up and twitching)
    const tw = Math.sin(t * (crouch ? 20 : 8)) * 4;
    ctx.beginPath(); ctx.moveTo(-15, by); ctx.bezierCurveTo(-30, by + 2, -28 + tw, by - 22, -17 + tw, by - 24);
    ctx.strokeStyle = OUT; ctx.lineWidth = 8; ctx.stroke(); ctx.strokeStyle = '#1b1b22'; ctx.lineWidth = 4.6; ctx.stroke();
    ctx.beginPath(); ctx.arc(-17 + tw, by - 24, 2.4, 0, 7); ctx.fillStyle = '#f4f4f4'; ctx.fill(); // white tail tip

    // legs
    const leg = (x, p, front) => {
      let dx = Math.sin(p) * 7, lift = Math.max(0, Math.cos(p)) * 4;
      if (leap) { dx = front ? 12 : -12; lift = 6; }
      if (crouch) { dx = 0; lift = 0; }
      const top = { x: x, y: by + 2 }, foot = { x: x + dx, y: -lift - 1.5 };
      limb(ctx, [top, foot], 5.5, '#1b1b22');
      ell(ctx, foot.x + 1.5, foot.y, 4.2, 2.6); fs(ctx, '#f7f7f7', 1.6);
    };
    leg(-11 + wig * 0.3, ph + Math.PI, false); leg(12, ph, true);
    // body
    ctx.save(); if (crouch) ctx.translate(wig, 0);
    ell(ctx, -1, by, 18, crouch ? 8 : 9.5, crouch ? 0.14 : 0); fs(ctx, '#1b1b22', 2.2);
    ell(ctx, 4, by + 4.2, 10, 4.4); ctx.fillStyle = '#f7f7f7'; ctx.fill(); // white belly
    ctx.restore();
    leg(-6, ph, false); leg(17, ph + Math.PI, true);

    // head
    ctx.save(); ctx.translate(crouch ? 19 : 20, by - (crouch ? 1 : 6) + (leap ? -3 : 0));
    // ears
    [[-6, 1], [3.5, 1]].forEach(([x], i) => { ctx.beginPath(); ctx.moveTo(x - 4, -5); ctx.lineTo(x + (i ? 1 : -1), -16 - i); ctx.lineTo(x + 5, -6); ctx.closePath(); fs(ctx, '#1b1b22', 2); ctx.fillStyle = '#f19cb1'; ctx.beginPath(); ctx.moveTo(x - 1.5, -6); ctx.lineTo(x + (i ? 1 : -1), -12.5); ctx.lineTo(x + 2.5, -6.5); ctx.closePath(); ctx.fill(); });
    ctx.beginPath(); ctx.arc(0, 0, 9.6, 0, 7); fs(ctx, '#1b1b22', 2.2);
    ell(ctx, 5.4, 3.6, 5.8, 4.6); ctx.fillStyle = '#f7f7f7'; ctx.fill();            // white muzzle
    ctx.fillStyle = '#f7f7f7'; ctx.beginPath(); ctx.moveTo(-0.5, -9); ctx.lineTo(2.6, -3); ctx.lineTo(4.4, -9); ctx.closePath(); ctx.fill(); // blaze
    // eyes
    if (dead) { ctx.strokeStyle = '#e8f5a1'; ctx.lineWidth = 1.6; [[-1, -2], [6, -2]].forEach(([x, y]) => { ctx.beginPath(); ctx.moveTo(x - 2, y - 2); ctx.lineTo(x + 2, y + 2); ctx.moveTo(x + 2, y - 2); ctx.lineTo(x - 2, y + 2); ctx.stroke(); }); }
    else {
      [[-1, -2], [6.4, -2]].forEach(([x, y]) => { ell(ctx, x, y, 2.5, 3); ctx.fillStyle = '#c6ef4a'; ctx.fill(); ctx.fillStyle = '#111'; ctx.fillRect(x - 0.5, y - 2.6, 1.2, 5.2); });
      if (leap || s.hiss) { ctx.strokeStyle = '#c6ef4a'; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-4, -6.2); ctx.lineTo(1.4, -4.4); ctx.moveTo(9.6, -6.2); ctx.lineTo(5, -4.4); ctx.stroke(); }
    }
    // nose, mouth, whiskers
    ctx.fillStyle = '#f19cb1'; ctx.beginPath(); ctx.moveTo(8.5, 1); ctx.lineTo(12, 1); ctx.lineTo(10.2, 3.4); ctx.closePath(); ctx.fill();
    if (leap || s.hiss) { ell(ctx, 9, 7, 3.6, 2.6); fs(ctx, '#6a1522', 1.2); ctx.fillStyle = '#fff'; ctx.fillRect(7.2, 4.6, 1.1, 1.8); ctx.fillRect(10, 4.6, 1.1, 1.8); }
    else { ctx.strokeStyle = '#444'; ctx.lineWidth = 1.2; ctx.beginPath(); ctx.moveTo(10, 3.4); ctx.quadraticCurveTo(9, 6.6, 6.4, 6); ctx.moveTo(10, 3.4); ctx.quadraticCurveTo(11.5, 6.4, 13.5, 5.2); ctx.stroke(); }
    ctx.strokeStyle = 'rgba(255,255,255,0.95)'; ctx.lineWidth = 1;
    ctx.beginPath(); ctx.moveTo(12, 2.5); ctx.lineTo(22, 0); ctx.moveTo(12, 3.4); ctx.lineTo(22, 5); ctx.stroke();
    ctx.restore();
    ctx.restore();
  }

  // ------------------------------------------------------------------ hero swimming (freestyle, swimsuit)
  /** s = { t, expr, throwP }. Body lies along the water surface; y = 0 is the floor, waterline ≈ y -12. */
  function heroSwim(ctx, s) {
    const t = s.t, ph = t * 7.5;
    ctx.save(); ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    const bob = Math.sin(t * 5) * 1.2;
    ctx.translate(0, bob - 4);
    const hip = { x: -13, y: -14 }, sh = { x: 8, y: -17 };

    // legs: flutter kick, trailing behind
    [0, Math.PI].forEach((o) => {
      const k = Math.sin(ph * 2 + o) * 5;
      limb(ctx, [hip, { x: hip.x - 11, y: hip.y + 1 + k * 0.5 }, { x: hip.x - 23, y: hip.y + 2 + k }], 6.4, SKIN);
      ell(ctx, hip.x - 25, hip.y + 2 + k, 4.5, 2.4, k * 0.05); fs(ctx, SKIN, 1.6);
    });
    // far arm (reaching under water)
    const arm = (a, col) => {
      const hd = { x: sh.x + Math.cos(a) * 18, y: sh.y + Math.sin(a) * 15 };
      const el = ik(sh, hd, 9, 9, Math.sin(a) > 0 ? -1 : 1);
      limb(ctx, [sh, el, el.end], 5.4, col);
      ctx.beginPath(); ctx.arc(el.end.x, el.end.y, 3, 0, 7); fs(ctx, col, 1.6);
    };
    arm(ph + Math.PI, '#cf9873');

    // torso (bare), trunks
    ell(ctx, -1, -14, 17, 7.6); fs(ctx, SKIN, 2.2);
    ctx.fillStyle = 'rgba(86,56,36,0.25)'; for (let i = 0; i < 6; i++) ctx.fillRect(-4 + i * 3, -17 + (i % 2) * 4, 1, 1);
    // swim trunks: proper shorts hugging the hips (red, white waistband and hem)
    rr(ctx, -22, -20.5, 17.5, 12.5, 4.5); fs(ctx, '#e63946', 2.2);
    ctx.save(); rr(ctx, -22, -20.5, 17.5, 12.5, 4.5); ctx.clip();
    ctx.fillStyle = '#fff'; ctx.fillRect(-23, -20.5, 20, 3); ctx.fillRect(-23, -10, 20, 2); ctx.restore();

    // head leads, cap still on. Slightly tilted forward/down while paddling.
    ctx.save(); ctx.translate(21, -22 + Math.sin(ph) * 0.8); ctx.rotate(0.25);
    drawHead(ctx, { expr: s.expr || 'focus', blink: false });
    // swimming goggles pushed on the forehead, under the cap
    ctx.strokeStyle = OUT; ctx.lineWidth = 2.2; ctx.fillStyle = 'rgba(120,210,255,0.5)';
    [[3.4, -0.2], [8.8, -0.2]].forEach(([x, y]) => { ctx.beginPath(); ctx.arc(x, y, 3.9, 0, 7); ctx.fill(); ctx.stroke(); });
    ctx.beginPath(); ctx.moveTo(-0.6, -0.4); ctx.lineTo(-12, -1.5); ctx.stroke(); // strap
    ctx.restore();

    // near arm: the crawl stroke, sweeping over the water
    let a = ph;
    if (s.throwP != null && s.throwP >= 0) a = U.lerp(-2.4, 0.1, U.clamp(s.throwP, 0, 1));
    arm(a, SKIN);
    ctx.restore();
  }

  // ------------------------------------------------------------------ obstacles
  function buoy(ctx, t) {
    ctx.save(); ctx.translate(0, Math.sin(t * 3) * 1.5);
    ctx.strokeStyle = OUT; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, -13, 17, Math.PI * 0.15, Math.PI * 0.85); ctx.stroke(); // rope hint
    ctx.beginPath(); ctx.arc(0, -15, 14, 0, 7); fs(ctx, '#fff', 2.2);
    ctx.save(); ctx.beginPath(); ctx.arc(0, -15, 14, 0, 7); ctx.clip();
    ctx.fillStyle = '#ff4d4d'; ctx.fillRect(-16, -23, 32, 6.5); ctx.fillRect(-16, -9, 32, 6.5); ctx.restore();
    ctx.beginPath(); ctx.arc(0, -15, 14, 0, 7); ctx.strokeStyle = OUT; ctx.lineWidth = 2.2; ctx.stroke();
    ctx.fillStyle = 'rgba(255,255,255,0.6)'; ctx.beginPath(); ctx.arc(-5, -20, 3, 0, 7); ctx.fill();
    ctx.restore();
  }
  function cone(ctx) {
    ctx.save(); ctx.lineJoin = 'round';
    rr(ctx, -14, -5, 28, 6, 2); fs(ctx, '#e8722e', 2);
    ctx.beginPath(); ctx.moveTo(-10, -5); ctx.lineTo(-2.4, -31); ctx.lineTo(2.4, -31); ctx.lineTo(10, -5); ctx.closePath(); fs(ctx, '#ff8a3d', 2);
    ctx.fillStyle = '#fff'; ctx.beginPath(); ctx.moveTo(-6.6, -15.5); ctx.lineTo(6.6, -15.5); ctx.lineTo(5.2, -21); ctx.lineTo(-5.2, -21); ctx.closePath(); ctx.fill();
    ctx.restore();
  }
  function books(ctx) {
    const b = [['#3a86ff', -19, 14, 0], ['#ef476f', -17, 12, 0.03], ['#06d6a0', -20, 14, -0.02]];
    let y = 0;
    ctx.save(); ctx.lineJoin = 'round';
    b.forEach(([col, x, h, r], i) => {
      ctx.save(); ctx.translate(0, y - h); ctx.rotate(r);
      rr(ctx, x, 0, 38 - Math.abs(i - 1) * 3, h, 2.5); fs(ctx, col, 2);
      ctx.fillStyle = 'rgba(255,255,255,0.85)'; ctx.fillRect(x + 4, 3, 5, h - 6);
      ctx.fillRect(x + 28, 3, 2.2, h - 6);
      ctx.restore(); y -= h;
    });
    ctx.fillStyle = '#fff'; ctx.font = '700 9px serif'; ctx.textAlign = 'center'; ctx.fillText('Σ', 0, -29);
    ctx.restore();
  }
  function platform(ctx, w) {
    ctx.save(); ctx.lineJoin = 'round';
    rr(ctx, 0, 0, w, 14, 6); fs(ctx, '#d9825b', 2.2);
    ctx.fillStyle = '#f2b98a'; rr(ctx, 3, 2, w - 6, 5, 3); ctx.fill();
    ctx.fillStyle = 'rgba(0,0,0,0.18)'; for (let x = 14; x < w - 8; x += 22) ctx.fillRect(x, 9, 9, 2);
    ctx.restore();
  }

  // ------------------------------------------------------------------ collectibles
  function coin(ctx, t) {
    const sx = Math.cos(t * 5);
    ctx.save(); ctx.scale(Math.abs(sx) * 0.85 + 0.15, 1);
    ctx.beginPath(); ctx.arc(0, 0, 10.5, 0, 7); fs(ctx, '#ffd23f', 2);
    ctx.beginPath(); ctx.arc(0, 0, 6.8, 0, 7); ctx.strokeStyle = '#e0a800'; ctx.lineWidth = 1.5; ctx.stroke();
    ctx.fillStyle = '#b97f00'; ctx.font = '700 10px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('€', 0, 0.5);
    ctx.restore();
  }
  function note(ctx, t) {
    ctx.save(); ctx.rotate(Math.sin(t * 3) * 0.12);
    rr(ctx, -15, -9, 30, 18, 3); fs(ctx, '#7bd88f', 2);
    ctx.strokeStyle = '#3f9d5a'; ctx.lineWidth = 1.2; rr(ctx, -12, -6.5, 24, 13, 2); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 0, 5, 0, 7); ctx.fillStyle = '#e9ffe9'; ctx.fill(); ctx.strokeStyle = '#3f9d5a'; ctx.stroke();
    ctx.fillStyle = '#2f7d49'; ctx.font = '700 8px system-ui, sans-serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle'; ctx.fillText('€', 0, 0.5);
    ctx.fillStyle = '#2f7d49'; ctx.fillRect(-11, -5, 3, 2); ctx.fillRect(8, 3, 3, 2);
    ctx.restore();
  }
  /** A sheet of paper with a maths proof scribbled on it. */
  function paper(ctx, t, scale) {
    ctx.save(); ctx.scale(scale || 1, scale || 1); ctx.lineJoin = 'round';
    ctx.beginPath(); ctx.moveTo(-9, -12); ctx.lineTo(4, -12); ctx.lineTo(10, -6); ctx.lineTo(10, 12); ctx.lineTo(-9, 12); ctx.closePath(); fs(ctx, '#fffef7', 1.8);
    ctx.beginPath(); ctx.moveTo(4, -12); ctx.lineTo(4, -6); ctx.lineTo(10, -6); ctx.closePath(); ctx.fillStyle = '#d9d6c4'; ctx.fill(); ctx.strokeStyle = OUT; ctx.lineWidth = 1.2; ctx.stroke();
    ctx.fillStyle = '#2a4fd6'; ctx.font = 'italic 700 9px "Times New Roman", serif'; ctx.textAlign = 'center'; ctx.textBaseline = 'middle';
    ctx.fillText('∫x²', -1.5, -3);
    ctx.fillRect(-6.5, 2.5, 11, 1); ctx.fillRect(-6.5, 5.5, 8, 1);
    ctx.font = '700 7px serif'; ctx.fillText('∎', 5.5, 9.2);
    ctx.restore();
  }
  function bombItem(ctx, t) {
    ctx.save();
    ctx.beginPath(); ctx.arc(0, 2, 13, 0, 7); fs(ctx, '#2b2f3f', 2.2);
    ctx.fillStyle = 'rgba(255,255,255,0.25)'; ctx.beginPath(); ctx.arc(-4.5, -2, 4, 0, 7); ctx.fill();
    rr(ctx, -4.5, -13, 9, 5, 1.5); fs(ctx, '#6d7388', 1.6);
    ctx.strokeStyle = '#c9a66b'; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(1, -13); ctx.quadraticCurveTo(7, -20, 12, -16); ctx.stroke();
    const f = 2 + Math.sin(t * 30) * 1; star(ctx, 12.5, -16.5, 4 + f, t * 6); ctx.fillStyle = '#ffd166'; ctx.fill();
    // a sad little face: "va tutto male"
    ctx.strokeStyle = '#fff'; ctx.lineWidth = 1.5; ctx.lineCap = 'round';
    ctx.beginPath(); ctx.moveTo(-6, 0); ctx.lineTo(-2.5, 1.5); ctx.moveTo(6, 0); ctx.lineTo(2.5, 1.5); ctx.stroke();
    ctx.beginPath(); ctx.arc(0, 11, 4, Math.PI * 1.15, Math.PI * 1.85); ctx.stroke();
    ctx.restore();
  }
  function heart(ctx, t, s) {
    const k = (s || 1) * (1 + Math.sin(t * 6) * 0.06);
    ctx.save(); ctx.scale(k, k);
    ctx.beginPath(); ctx.moveTo(0, 9); ctx.bezierCurveTo(-16, -3, -9, -15, 0, -7); ctx.bezierCurveTo(9, -15, 16, -3, 0, 9); ctx.closePath(); fs(ctx, '#ff4d6d', 2);
    ctx.fillStyle = 'rgba(255,255,255,0.55)'; ctx.beginPath(); ctx.arc(-5.5, -6, 2.2, 0, 7); ctx.fill();
    ctx.restore();
  }
  /** The scudetto: a little shield in giallorosso with the tricolore band on top. ~32px tall, centred. */
  function scudetto(ctx) {
    ctx.save(); ctx.lineJoin = 'round';
    const shape = () => { ctx.beginPath(); ctx.moveTo(-14, -16); ctx.lineTo(14, -16); ctx.lineTo(14, 2); ctx.bezierCurveTo(14, 11, 6, 15, 0, 18); ctx.bezierCurveTo(-6, 15, -14, 11, -14, 2); ctx.closePath(); };
    shape(); ctx.fillStyle = '#f7c52b'; ctx.fill();
    ctx.save(); shape(); ctx.clip();
    ctx.fillStyle = '#a4161a'; ctx.fillRect(0, -17, 16, 40);                      // right half: rosso
    ctx.fillStyle = '#1f9d55'; ctx.fillRect(-15, -17, 10, 7);                      // tricolore band
    ctx.fillStyle = '#fff'; ctx.fillRect(-5, -17, 10, 7);
    ctx.fillStyle = '#d62828'; ctx.fillRect(5, -17, 10, 7);
    ctx.restore();
    shape(); ctx.lineWidth = 2.6; ctx.strokeStyle = OUT; ctx.stroke();
    star(ctx, 0, 3, 6.2, 0); ctx.fillStyle = '#fff'; ctx.fill(); ctx.lineWidth = 1.3; ctx.stroke();
    ctx.restore();
  }

  /** Round badge holding a power-up icon. kind: bike | skis | sword | shield | pencil. `who` = character id (some icons differ per character) */
  function powerBadge(ctx, kind, t, who) {
    const alt = who && Art.alt[who] && Art.alt[who].badge && Art.alt[who].badge[kind];
    const col = alt ? alt.color : { bike: '#f4a261', skis: '#4cc9f0', sword: '#ffd166', shield: '#ffe08a', pencil: '#ff9ec4' }[kind];
    ctx.save();
    if (kind === 'sword') { // rare: pulsing golden halo + sparkles
      const g = 0.25 + Math.sin(t * 6) * 0.1;
      ctx.fillStyle = `rgba(255,209,102,${g})`; ctx.beginPath(); ctx.arc(0, 0, 33, 0, 7); ctx.fill();
      for (let i = 0; i < 4; i++) { const a = t * 2 + (i * Math.PI) / 2; star(ctx, Math.cos(a) * 30, Math.sin(a) * 30, 3.6, a); ctx.fillStyle = '#fff6c2'; ctx.fill(); }
    }
    ctx.beginPath(); ctx.arc(0, 0, 21, 0, 7); fs(ctx, '#fff', 2.4);
    ctx.beginPath(); ctx.arc(0, 0, 17, 0, 7); ctx.fillStyle = col; ctx.fill();
    ctx.lineCap = 'round'; ctx.lineJoin = 'round';
    if (alt) {
      alt.draw(ctx, t);
    } else if (kind === 'bike') {
      ctx.save(); ctx.scale(0.3, 0.3); ctx.translate(-2, 26); bikeIcon(ctx); ctx.restore();
    } else if (kind === 'skis') {
      ctx.strokeStyle = OUT; ctx.lineWidth = 5; [[-1, 1], [1, 1]].forEach(([d]) => { ctx.beginPath(); ctx.moveTo(-9 * d, 10); ctx.lineTo(9 * d, -10); ctx.stroke(); });
      ctx.strokeStyle = '#fff'; ctx.lineWidth = 2.6; ctx.beginPath(); ctx.moveTo(-9, 10); ctx.lineTo(9, -10); ctx.stroke();
      ctx.strokeStyle = '#e63946'; ctx.beginPath(); ctx.moveTo(9, 10); ctx.lineTo(-9, -10); ctx.stroke();
    } else if (kind === 'shield') {
      ctx.save(); ctx.scale(0.78, 0.78); ctx.translate(0, -1); scudetto(ctx); ctx.restore();
    } else if (kind === 'pencil') {
      ctx.save(); ctx.rotate(-Math.PI / 4); ctx.translate(-14, 0); pencil(ctx, 28, t); ctx.restore();
    } else {
      ctx.save(); ctx.rotate(-Math.PI / 4); ctx.translate(-12, 0); sword(ctx, 26, 0, t); ctx.restore();
    }
    ctx.restore();
  }
  function bikeIcon(ctx) { // simple white Vespa silhouette used in badges / HUD
    ctx.fillStyle = '#fff'; ctx.strokeStyle = OUT; ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(-27, -11, 11, 0, 7); ctx.stroke(); ctx.fill();
    ctx.beginPath(); ctx.arc(31, -11, 11, 0, 7); ctx.stroke(); ctx.fill();
    ctx.beginPath(); ctx.moveTo(-42, -13); ctx.quadraticCurveTo(-46, -36, -26, -40); ctx.lineTo(-8, -38); ctx.quadraticCurveTo(-1, -30, -3, -17); ctx.lineTo(8, -12); ctx.lineTo(13, -48); ctx.lineTo(25, -52); ctx.lineTo(30, -22); ctx.lineTo(36, -13); ctx.lineTo(-6, -12); ctx.closePath(); ctx.stroke(); ctx.fill();
  }

  const Art = { head: drawHead, hero, heroSwim, bike, sword, pencil, meteor, meteorTrail, oldman, cat, buoy, scudetto, cone, books, platform, coin, note, paper, bombItem, heart, powerBadge, star, bikeIcon, rr, ell, fs, limb, ik, OUT, alt: {} };
  Q.Art = Art;
})();
