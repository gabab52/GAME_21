/*
 * Main — game state machine (menu → playing ⇄ paused → over), main loop, HUD and the glue that
 * turns World events into sound, particles and UI. Gameplay rules live in world.js.
 */
(function () {
  const Q = (globalThis.Q = globalThis.Q || {});
  const C = Q.C, U = Q.U, Art = Q.Art, Sfx = Q.Sfx, Input = Q.Input;
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);

  // ------------------------------------------------------------ setup
  const canvas = $('game');
  const renderer = new Q.Renderer(canvas);
  const fx = new Q.FX();
  let world = new Q.World();       // in 'menu' this is the attract-mode demo run by the bot
  let mode = 'menu';               // menu | playing | paused | over
  let best = 0;
  let hitstop = 0, timeScale = 1;
  let clock = 0, last = 0, musicTick = 0;
  let autoplay = params.has('autoplay');
  const ambient = { puff: 0, dust: 0 };

  try { best = parseInt(localStorage.getItem('qedrun.best') || '0', 10) || 0; } catch (_) {}
  $('bestMenu').textContent = best;

  // ------------------------------------------------------------ layout
  const stage = $('stage'), controls = $('controls');
  function layout() {
    const touch = document.body.classList.contains('touch-on');
    const availW = window.innerWidth;
    const availH = window.innerHeight - (touch ? 0 : controls.offsetHeight + 14);
    const w = Math.max(320, Math.min(availW, availH * (16 / 9)));
    const h = w * 9 / 16;
    stage.style.width = w + 'px'; stage.style.height = h + 'px';
    stage.style.setProperty('--s', w / 960);
    renderer.resize(w, h);
  }
  window.addEventListener('resize', layout);
  function enableTouch() { if (!document.body.classList.contains('touch-on')) { document.body.classList.add('touch-on'); layout(); } }
  if (matchMedia('(pointer: coarse)').matches || 'ontouchstart' in window) document.body.classList.add('touch-on');
  window.addEventListener('touchstart', enableTouch, { passive: true, once: true });
  Input.bindTouch($('touch'));
  if (document.fonts && document.fonts.load) { document.fonts.load('700 40px Bungee'); document.fonts.load('600 16px Fredoka'); }

  // ------------------------------------------------------------ HUD
  const el = {
    hud: $('hud'), score: $('score'), dist: $('dist'), money: $('money'), ammo: $('ammo'), bombs: $('bombs'),
    hearts: $('hearts'), power: $('power'), powerLabel: $('powerLabel'), powerBar: $('powerBar'), powerIcon: $('powerIcon'),
    chipAmmo: $('chipAmmo'), chipBomb: $('chipBomb'), banner: $('banner'),
  };
  function icon(canvasEl, fn, alpha) {
    const c = canvasEl.getContext('2d'), s = canvasEl.width;
    c.clearRect(0, 0, s, s); c.save(); c.translate(s / 2, s / 2); c.globalAlpha = alpha == null ? 1 : alpha; fn(c, s); c.restore();
  }
  icon($('icoCoin'), (c, s) => { c.scale(s / 28, s / 28); Art.coin(c, 0); });
  icon($('icoPaper'), (c, s) => { c.scale(s / 28, s / 28); Art.paper(c, 0, 1); });
  icon($('icoBomb'), (c, s) => { c.scale(s / 36, s / 36); Art.bombItem(c, 0); });
  const heartEls = [];
  for (let i = 0; i < C.MAX_HEARTS; i++) { const cv = document.createElement('canvas'); cv.width = cv.height = 48; el.hearts.appendChild(cv); heartEls.push(cv); }
  const hud = { score: -1, dist: -1, money: -1, ammo: -1, bombs: -1, hearts: -1, power: null, bar: -1, low: false };

  function drawHearts(n) {
    heartEls.forEach((cv, i) => icon(cv, (c, s) => { c.scale(s / 30, s / 30); Art.heart(c, 0, 1); }, i < n ? 1 : 0.2));
  }
  function drawPowerIcon(kind) { icon(el.powerIcon, (c, s) => { c.scale(s / 52, s / 52); Art.powerBadge(c, kind, 0); }); }

  function updateHud(w) {
    if (hud.score !== w.score) { hud.score = w.score; el.score.textContent = w.score.toLocaleString('en-US'); }
    const d = Math.floor(w.meters);
    if (hud.dist !== d) { hud.dist = d; el.dist.textContent = d; }
    if (hud.money !== w.money) { if (hud.money >= 0) bump(el.money.parentElement); hud.money = w.money; el.money.textContent = w.money; }
    if (hud.ammo !== w.ammo) { if (hud.ammo >= 0 && w.ammo > hud.ammo) bump(el.chipAmmo); hud.ammo = w.ammo; el.ammo.textContent = w.ammo; el.chipAmmo.classList.toggle('empty', w.ammo === 0); }
    if (hud.bombs !== w.bombs) { if (hud.bombs >= 0 && w.bombs > hud.bombs) bump(el.chipBomb); hud.bombs = w.bombs; el.bombs.textContent = w.bombs; el.chipBomb.classList.toggle('empty', w.bombs === 0); }
    if (hud.hearts !== w.hearts) {
      const lost = hud.hearts > w.hearts; hud.hearts = w.hearts; drawHearts(w.hearts);
      if (lost && heartEls[w.hearts]) { heartEls[w.hearts].classList.remove('pop'); void heartEls[w.hearts].offsetWidth; heartEls[w.hearts].classList.add('pop'); }
    }
    const pt = w.power.type;
    if (pt !== hud.power) {
      hud.power = pt; el.power.classList.toggle('hidden', !pt);
      if (pt) { drawPowerIcon(pt); el.powerLabel.textContent = C.POWER[pt].label; el.powerBar.style.background = C.POWER[pt].color; }
    }
    if (pt) {
      const k = U.clamp(w.power.t / w.power.dur, 0, 1);
      if (Math.abs(hud.bar - k) > 0.004) { hud.bar = k; el.powerBar.style.transform = `scaleX(${k})`; }
      const low = w.power.t < 2; if (low !== hud.low) { hud.low = low; el.power.classList.toggle('low', low); }
    }
  }
  function bump(node) { node.classList.remove('bump'); void node.offsetWidth; node.classList.add('bump'); }
  function banner(text, cls) {
    el.banner.textContent = text; el.banner.className = 'banner ' + (cls || '');
    void el.banner.offsetWidth; el.banner.classList.add('show');
  }

  // ------------------------------------------------------------ screens
  const screens = { menu: $('menu'), pause: $('pause'), over: $('over') };
  function show(name) {
    for (const k in screens) screens[k].classList.toggle('hidden', k !== name);
    const playing = mode === 'playing' || mode === 'paused';
    el.hud.classList.toggle('hidden', !(playing || mode === 'over'));
    document.body.classList.toggle('hud-off', mode === 'menu');
  }

  function startGame() {
    Sfx.resume(); Sfx.play('ui');
    world = new Q.World(); fx.reset();
    hud.score = hud.dist = hud.money = hud.ammo = hud.bombs = hud.hearts = -1; hud.power = null; hud.low = false;
    el.power.classList.add('hidden'); el.banner.className = 'banner';
    hitstop = 0; timeScale = 1; ambient.puff = ambient.dust = 0;
    Input.clearEdges(); Input.clearHeld();
    mode = 'playing'; show(null);
    Sfx.startMusic();
    updateHud(world);
  }
  function setPaused(p) {
    if (p && mode === 'playing') { mode = 'paused'; show('pause'); Sfx.play('pause'); Sfx.stopMusic(); Sfx.setEngine(false); Input.clearHeld(); }
    else if (!p && mode === 'paused') { mode = 'playing'; show(null); Sfx.play('pause'); Sfx.startMusic(); if (world.power.type === 'bike') Sfx.setEngine(true, world.speedMul); Input.clearEdges(); }
  }
  function toMenu() {
    Sfx.play('ui'); Sfx.stopMusic(); Sfx.setEngine(false);
    world = new Q.World(); fx.reset(); mode = 'menu'; show('menu');
  }
  function gameOver() {
    mode = 'over';
    const isBest = world.score > best;
    if (isBest) { best = world.score; try { localStorage.setItem('qedrun.best', String(best)); } catch (_) {} }
    $('finalScore').textContent = world.score.toLocaleString('en-US');
    $('finalMoney').textContent = '€' + world.money;
    $('finalDist').textContent = Math.floor(world.meters) + ' m';
    $('finalBest').textContent = best.toLocaleString('en-US');
    $('newBest').classList.toggle('hidden', !isBest);
    $('quip').textContent = U.pick([
      'Va tutto male.', 'Il lemma era banale, in realtà.', 'Figaro ti manda i suoi saluti.', 'Dimostrazione non convergente.',
      'Francone ha mangiato bene.', 'Ricorda: ogni caduta è un controesempio.', 'Q.E.D. (Quasi Eri Dentro)',
    ]);
    $('bestMenu').textContent = best;
    show('over');
  }

  // Buttons must never keep keyboard focus: otherwise SPACE (jump) would "click" the last-pressed button again.
  document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('button'); if (b) b.blur(); });
  $('menuBtn1').addEventListener('click', toMenu);
  $('menuBtn2').addEventListener('click', toMenu);
  $('playBtn').addEventListener('click', startGame);
  $('resumeBtn').addEventListener('click', () => setPaused(false));
  $('restartBtn1').addEventListener('click', startGame);
  $('restartBtn2').addEventListener('click', startGame);
  $('pauseBtn').addEventListener('click', () => setPaused(mode === 'playing'));
  $('muteBtn').addEventListener('click', toggleMute);
  function toggleMute() { Sfx.resume(); Sfx.setMuted(!Sfx.muted); $('muteBtn').textContent = Sfx.muted ? '✕' : '♪'; }
  Input.on('mute', toggleMute);
  Input.on('pause', () => { if (mode === 'playing') setPaused(true); else if (mode === 'paused') setPaused(false); });
  Input.on('confirm', () => { if (mode === 'menu' || mode === 'over') startGame(); else if (mode === 'paused') setPaused(false); });
  window.addEventListener('keydown', (e) => { if (e.code === 'KeyR' && !e.repeat && (mode === 'over' || mode === 'paused')) startGame(); });
  window.addEventListener('blur', () => setPaused(true));
  document.addEventListener('visibilitychange', () => { if (document.hidden) setPaused(true); });
  ['pointerdown', 'keydown'].forEach((ev) => window.addEventListener(ev, () => Sfx.resume(), { once: true }));

  // ------------------------------------------------------------ world events → fx / sfx
  const GOLD = ['#ffd23f', '#fff1a8', '#ffb703'];
  function handle(e) {
    const p = world.player;
    switch (e.type) {
      case 'jump': Sfx.play('jump'); fx.burst(e.x, e.y, { n: 5, color: '#fff', min: 30, max: 120, dir: Math.PI, spread: 0.7, life: 0.35, size: 3, grav: -40 }); break;
      case 'djump': Sfx.play('djump'); fx.ring(e.x, e.y - 6, '#fff', 8, 0.35); break;
      case 'land': Sfx.play('land'); fx.burst(e.x, e.y, { n: 6, color: 'rgba(255,255,255,0.8)', min: 40, max: 140, dir: -Math.PI / 2, spread: 1.4, life: 0.35, size: 3, grav: 200 }); break;
      case 'coin': Sfx.play('coin'); fx.burst(e.x, e.y, { n: 5, color: GOLD, shape: 'star', min: 60, max: 160, life: 0.4, size: 4, grav: 200 }); fx.text(e.x, e.y - 16, '+€1', { color: '#ffd23f', size: 15, life: 0.6 }); break;
      case 'note': Sfx.play('note'); fx.burst(e.x, e.y, { n: 9, color: ['#7bd88f', '#e9ffe9', '#ffd23f'], shape: 'star', min: 80, max: 220, life: 0.5, size: 5, grav: 200 }); fx.text(e.x, e.y - 18, '+€5', { color: '#7bd88f', size: 19, life: 0.8 }); break;
      case 'paper_pick': Sfx.play('paper'); fx.burst(e.x, e.y, { n: 6, color: ['#fffef7', '#5a8cff'], shape: 'sq', min: 60, max: 180, life: 0.45, size: 4, grav: 200 }); fx.text(e.x, e.y - 18, '+∫', { color: '#9bbcff', size: 18, life: 0.7 }); break;
      case 'bomb_pick': Sfx.play('pickup'); fx.text(e.x, e.y - 20, '+BOMB', { color: '#ff6b6b', size: 18, life: 0.9 }); fx.ring(e.x, e.y, '#ff6b6b', 10, 0.4); break;
      case 'heart_pick': Sfx.play('heart'); fx.text(e.x, e.y - 20, '+1 ♥', { color: '#ff6b8b', size: 20, life: 0.9 }); fx.burst(e.x, e.y, { n: 10, color: ['#ff4d6d', '#ffc2d1'], min: 60, max: 200, life: 0.6, size: 4, grav: -50 }); break;
      case 'power_pick': Sfx.play('pickup'); fx.ring(e.x, e.y, C.POWER[e.kind].color, 12, 0.5); break;
      case 'power_start': {
        Sfx.play('power'); fx.doFlash(C.POWER[e.kind].color, 0.35);
        const label = { bike: 'VESPA!', skis: 'SKIS!', sword: 'SWORD!', shield: 'SCUDETTO!' }[e.kind];
        banner(label, e.kind === 'skis' ? 'teal' : e.kind === 'shield' ? 'gold' : '');
        if (e.kind === 'shield') fx.text(p.x, p.y - 100, 'Forza Roma!', { color: '#f7c52b', size: 22, life: 1.4 });
        fx.burst(p.x, p.y - 30, { n: 22, color: [C.POWER[e.kind].color, '#fff'], shape: 'star', min: 80, max: 320, life: 0.7, size: 5, grav: 100 });
        if (e.kind === 'bike') Sfx.setEngine(true, world.speedMul);
        break;
      }
      case 'power_end':
        if (e.kind === 'bike') Sfx.setEngine(false);
        if (!e.silent) { Sfx.play('powerEnd'); fx.burst(p.x, p.y - 20, { n: 14, color: 'rgba(255,255,255,0.85)', shape: 'smoke', min: 30, max: 160, life: 0.6, size: 7, grav: -20 }); }
        break;
      case 'shield_block':
        Sfx.play('shield'); fx.doShake(3);
        fx.burst(e.x, e.y, { n: 10, color: ['#f7c52b', '#a4161a', '#fff'], shape: 'star', size: 5, min: 100, max: 300, life: 0.45, grav: 100 });
        fx.text(e.x, e.y - 24, 'PARATO!', { color: '#f7c52b', size: 17, life: 0.6 });
        break;
      case 'splash':
        Sfx.play('splash');
        fx.burst(e.x, e.y - 8, { n: 16, color: ['#8fe3f7', '#fff', '#2fa8de'], shape: 'dot', size: 3.4, min: 80, max: 300, dir: -Math.PI / 2, spread: 0.9, life: 0.6, grav: 900 });
        break;
      case 'costume':
        Sfx.play('pop');
        fx.burst(e.x, e.y, { n: 12, color: ['#fff', '#e8eef8'], shape: 'smoke', size: 8, min: 20, max: 120, life: 0.5, grav: -30, grow: 28 });
        fx.burst(e.x, e.y, { n: 8, color: ['#ffd166', '#fff'], shape: 'star', size: 5, min: 60, max: 220, life: 0.6, grav: 60 });
        fx.text(e.x, e.y - 52, e.swim ? 'COSTUME!' : 'VIA IL COSTUME!', { color: e.swim ? '#8fe3f7' : '#ffd166', size: 18, life: 0.9 });
        break;
      case 'stroke': Sfx.play('stroke'); fx.burst(e.x, e.y - 6, { n: 4, color: ['#fff', '#8fe3f7'], shape: 'dot', size: 3, min: 30, max: 110, dir: Math.PI / 2, spread: 0.8, life: 0.5, grav: -60 }); break;
      case 'throw': Sfx.play('throw'); break;
      case 'empty': Sfx.play('empty'); break;
      case 'paper_hit': Sfx.play('hitEnemy'); fx.burst(e.x, e.y, { n: 8, color: ['#fffef7', '#5a8cff'], shape: 'sq', min: 80, max: 260, life: 0.5, size: 4, grav: 400 }); break;
      case 'enemy_hit': {
        fx.burst(e.x, e.y, { n: 7, color: ['#ffd166', '#fff'], shape: 'star', min: 80, max: 240, life: 0.4, size: 5, grav: 200 });
        fx.doShake(4); hitstop = Math.max(hitstop, 0.04);
        if (e.kind === 'oldman') { Sfx.play('grumble'); const en = world.enemies.find((o) => o.kind === 'oldman' && !o.dead); if (en && en.hits === 1) fx.parts.push({ x: en.x, y: en.y - 52, vx: 120, vy: -380, life: 1.2, max: 1.2, size: 8, color: '#000', shape: 'glasses', grav: 1200, drag: 0, rot: 0, vr: 7 }); }
        break;
      }
      case 'speech': fx.bubble(e.x, e.y, e.text, 1.3); break;
      case 'hiss': Sfx.play('hiss'); fx.text(e.x, e.y - 30, 'HSSS!', { color: '#c6ef4a', size: 15, life: 0.6 }); break;
      case 'kill': {
        hitstop = Math.max(hitstop, 0.07); fx.doShake(e.src === 'bomb' ? 8 : 9);
        Sfx.play('kill');
        fx.text(e.x, e.y - 26, '+' + e.pts, { color: '#ffd166', size: 24, life: 1 });
        if (e.kind === 'oldman') {
          fx.text(e.x, e.y - 70, 'Q.E.D. ∎', { color: '#fff', size: 30, life: 1.4, vy: -30 });
          fx.burst(e.x, e.y, { n: 14, color: '#fffef7', shape: 'paper', size: 8, min: 80, max: 360, life: 1.2, grav: 300 });
          fx.burst(e.x, e.y, { n: 16, color: '#f6f5ef', shape: 'feather', size: 9, min: 80, max: 300, life: 1, grav: 150 }); // beard hair
          fx.burst(e.x, e.y, { n: 10, color: ['#ffd166', '#fff'], shape: 'star', size: 6, min: 100, max: 360, life: 0.7, grav: 100 });
          fx.parts.push({ x: e.x, y: e.y - 40, vx: -160, vy: -520, life: 1.4, max: 1.4, size: 8, color: '#000', shape: 'glasses', grav: 1300, drag: 0, rot: 0, vr: 10 });
        } else if (e.kind === 'cat') {
          fx.text(e.x, e.y - 70, 'MIAO?!', { color: '#c6ef4a', size: 22, life: 1.1 });
          fx.burst(e.x, e.y, { n: 12, color: ['#1b1b22', '#f7f7f7'], shape: 'feather', size: 7, min: 80, max: 280, life: 0.9, grav: 200 });
          fx.burst(e.x, e.y, { n: 6, color: ['#ffd166', '#fff'], shape: 'star', size: 5, min: 100, max: 300, life: 0.6, grav: 100 });
        }
        break;
      }
      case 'stomp': Sfx.play('stomp'); fx.text(e.x, e.y - 24, 'BOING!', { color: '#fff', size: 18, life: 0.6 }); break;
      case 'smash': Sfx.play('smash'); fx.doShake(5); fx.burst(e.x, e.y, { n: 12, color: e.kind === 'cone' ? ['#ff8a3d', '#fff'] : ['#3a86ff', '#ef476f', '#06d6a0', '#fff'], shape: 'sq', size: 6, min: 100, max: 340, life: 0.7, grav: 700 }); break;
      case 'hurt':
        Sfx.play('hurt'); fx.doShake(e.fatal ? 18 : 12); fx.doFlash('#ff2e4d', 0.55); hitstop = Math.max(hitstop, e.fatal ? 0.15 : 0.1);
        fx.burst(e.x, e.y, { n: 12, color: ['#ff4d6d', '#fff', '#ffd166'], shape: 'star', size: 5, min: 120, max: 320, life: 0.6, grav: 300 });
        fx.text(e.x, e.y - 34, 'OUCH!', { color: '#ff6b8b', size: 22, life: 0.8 });
        break;
      case 'die': Sfx.stopMusic(); Sfx.setEngine(false); Sfx.play('gameover'); break;
      case 'bomb_arm': Sfx.play('bombArm'); Sfx.say('Va tutto male'); break;
      case 'bomb_blast':
        Sfx.play('bombBlast'); fx.doShake(30); fx.doFlash('#fff', 1);
        for (let i = 0; i < 5; i++) fx.ring(e.x, e.y, i % 2 ? '#ffd166' : '#ff5c33', 20 + i * 24, 0.5 + i * 0.1);
        fx.burst(e.x, e.y, { n: 60, color: ['#ff5c33', '#ffd166', '#fff', '#ff2e4d'], shape: 'star', size: 9, min: 200, max: 900, life: 1.1, grav: 200 });
        fx.burst(e.x, e.y, { n: 24, color: 'rgba(40,30,40,0.7)', shape: 'smoke', size: 14, min: 60, max: 400, life: 1.2, grav: -60, grow: 40 });
        break;
      case 'warn': Sfx.play('warn'); break;
      case 'chomp': Sfx.play('chomp'); break;
      case 'meow': Sfx.play('meow'); break;
      case 'oldman_leave': fx.bubble(e.x, e.y, 'Mah! Ci rinuncio.', 1.4); break;
      case 'enemy_spawn':
        if (e.kind === 'oldman') { banner('FRANCONE!', 'red'); Sfx.play('grumble'); }
        else if (e.kind === 'cat') { banner('FIGARO!', ''); }
        break;
      case 'gameover': gameOver(); break;
    }
  }

  /** Continuous ambient effects (exhaust, snow spray, sword sparkles, running dust). */
  function ambientFx(w, dt) {
    const p = w.player, t = w.power.type;
    if (p.dead) return;
    if (t === 'bike') {
      ambient.puff -= dt;
      if (ambient.puff <= 0) { ambient.puff = 0.045; fx.burst(p.x - 46, p.y - 13, { n: 1, color: 'rgba(210,214,224,0.8)', shape: 'smoke', size: 5, min: 20, max: 70, dir: Math.PI, spread: 0.3, life: 0.45, grav: -30, grow: 14 }); }
      Sfx.setEngine(true, w.speedMul);
    } else if (t === 'skis' && p.onGround) {
      ambient.puff -= dt;
      if (ambient.puff <= 0) { ambient.puff = 0.03; fx.burst(p.x - 26, p.y - 3, { n: 2, color: ['#fff', '#d6f1ff'], shape: 'dot', size: 3, min: 60, max: 200, dir: Math.PI + 0.5, spread: 0.5, life: 0.4, grav: 300 }); }
    } else if (t === 'sword') {
      ambient.puff -= dt;
      if (ambient.puff <= 0) { ambient.puff = 0.05; fx.burst(p.x + U.rand(10, 90), p.y - U.rand(10, 80), { n: 1, color: ['#fff6c2', '#ffd166'], shape: 'star', size: 3.5, min: 10, max: 60, life: 0.5, grav: -20 }); }
    } else if (p.swim) {
      ambient.dust -= dt;
      if (ambient.dust <= 0) { ambient.dust = 0.12; fx.burst(p.x - 26, p.y - 12, { n: 1, color: 'rgba(255,255,255,0.75)', shape: 'dot', size: 2.8, min: 10, max: 60, dir: -Math.PI / 2, spread: 0.7, life: 0.7, grav: -90 }); }
    } else if (p.onGround && w.scroll > 0) {
      ambient.dust -= dt;
      if (ambient.dust <= 0) { ambient.dust = 0.11; fx.burst(p.x - 10, p.y - 1, { n: 1, color: 'rgba(255,255,255,0.45)', shape: 'dot', size: 2.6, min: 20, max: 70, dir: Math.PI + 0.3, spread: 0.4, life: 0.35, grav: -20 }); }
    }
  }

  // ------------------------------------------------------------ main loop
  function frame(now) {
    requestAnimationFrame(frame);
    const rdt = Math.min(0.05, (now - last) / 1000 || 0.016);
    last = now;
    tick(rdt);
  }
  /** One simulated + rendered frame. (Separate from `frame` so tests can drive time manually.) */
  function tick(rdt) {
    clock += rdt;

    if (mode === 'playing' || mode === 'over' || mode === 'menu') {
      let dt = rdt;
      if (hitstop > 0) { hitstop -= rdt; dt = 0; }
      // slow motion around the bomb blast
      const target = world.bombFuse > 0 ? 0.4 : world.bombFx > 1.55 ? 0.5 : 1;
      timeScale += (target - timeScale) * Math.min(1, rdt * 14);
      dt *= timeScale;

      if (dt > 0) {
        let inp;
        if (mode === 'playing') inp = autoplay ? Q.Bot.decide(world) : Input.snapshot();
        else if (mode === 'menu') { inp = Q.Bot.decide(world); }
        else inp = { left: false, right: false, down: false, jumpHeld: false, jumpPressed: false, throwPressed: false, bombPressed: false };
        if (mode === 'menu') { world.hearts = Math.max(world.hearts, 2); if (world.bombs < 1) world.bombs = 1; }
        world.update(dt, inp);
        const evs = world.events; world.events = [];
        if (mode === 'menu') { /* attract mode is silent */ for (const e of evs) if (e.type !== 'gameover') visualOnly(e); if (world.over) world = new Q.World(); }
        else for (const e of evs) handle(e);
        if (mode !== 'menu') ambientFx(world, dt);
      }
      fx.update(rdt, 0);
      if (mode === 'playing') {
        updateHud(world);
        musicTick -= rdt;
        if (musicTick <= 0) { musicTick = 1; Sfx.setTempo(122 + world.diff * 44 + (world.power.type ? 10 : 0)); }
      }
    }
    renderer.render(world, fx, clock);
  }
  /** attract-mode: only the cheap visual reactions (no sound, no banners) */
  function visualOnly(e) {
    if (['coin', 'note', 'kill', 'smash', 'paper_hit', 'jump', 'land'].includes(e.type)) {
      const keep = { sfx: Sfx.play, say: Sfx.say };
      Sfx.play = () => {}; Sfx.say = () => {};
      try { handle(e); } finally { Sfx.play = keep.sfx; Sfx.say = keep.say; }
    }
  }

  // ------------------------------------------------------------ boot
  Q.game = { get world() { return world; }, fx, renderer, get mode() { return mode; }, startGame, tick };
  layout();
  show('menu');
  if (autoplay || params.has('start')) startGame();
  // dev conveniences for screenshots/tests: ?autoplay&give=bike|skis|sword&t=40
  if (mode === 'playing') {
    if (params.get('t')) world.t = parseFloat(params.get('t'));
    // ff=<seconds>: let the bot play that long before the first rendered frame
    const ff = parseFloat(params.get('ff') || '0');
    for (let n = Math.floor(ff * 60); n > 0 && !world.over; n--) { world.update(1 / 60, Q.Bot.decide(world)); world.events.length = 0; }
    world.hearts = Math.max(world.hearts, 2);
    const g = params.get('give');
    if (g && C.POWER[g]) { world.startPower(g); for (let n = 0; n < 60 * parseFloat(params.get('after') || '0.6'); n++) { world.update(1 / 60, Q.Bot.decide(world)); world.events.length = 0; } }
    const step = (secs, inp) => { for (let n = 0; n < secs * 60; n++) { world.update(1 / 60, inp || Q.Bot.decide(world)); world.events.length = 0; } };
    if (params.has('swim')) { world.water.push({ x: 20, w: 1500 }); step(parseFloat(params.get('swim')) || 1.0); }
    if (params.has('oldman')) { world.spawnOldMan(); step(parseFloat(params.get('oldman')) || 2.6); }
    if (params.has('cat')) { world.spawnCat(); step(parseFloat(params.get('cat')) || 1.2); }
    if (params.has('bomb')) {
      world.spawnOldMan(); world.spawnCat(); step(2.4);
      world.bombs = 1; step(1 / 60, { left: false, right: false, down: false, jumpHeld: false, jumpPressed: false, throwPressed: false, bombPressed: true });
      step(parseFloat(params.get('bomb')) || 0.55);
    }
    fx.reset();
  }
  requestAnimationFrame((t) => { last = t; frame(t); });
})();
