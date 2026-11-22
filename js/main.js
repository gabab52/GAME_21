/*
 * Main — game state machine (title → menu → playing ⇄ paused → over), main loop, HUD, the character select and the
 * glue that turns World events into sound, particles and UI. Gameplay rules live in world.js.
 */
(function () {
  const Q = (globalThis.Q = globalThis.Q || {});
  const C = Q.C, U = Q.U, Art = Q.Art, Sfx = Q.Sfx, Input = Q.Input;
  const $ = (id) => document.getElementById(id);
  const params = new URLSearchParams(location.search);

  // ------------------------------------------------------------ progress (best scores, Sensei unlock)
  // localStorage can be unavailable (private mode, file:// quirks): everything also lives in memory for the session.
  const mem = {};
  const store = {
    get(k) { try { const v = localStorage.getItem(k); if (v != null) return v; } catch (_) {} return mem[k] != null ? mem[k] : null; },
    set(k, v) { mem[k] = String(v); try { localStorage.setItem(k, String(v)); } catch (_) {} },
  };
  const ORDER = Q.CHAR_ORDER;
  const bests = {};
  ORDER.forEach((id) => { bests[id] = parseInt(store.get('game21.best.' + id) || '0', 10) || 0; });
  // A character is playable if it isn't locked by default, or once it has been unlocked (finishing a run with Tullio unlocks the Sensei).
  const unlocked = {};
  ORDER.forEach((id) => { unlocked[id] = !Q.CHARS[id].locked || store.get('game21.unlocked.' + id) === '1'; });
  if (params.has('unlock')) ORDER.forEach((id) => (unlocked[id] = true)); // debug: only for this session, never saved
  // the highlighted character is Tullio by default. Debug: ?sel=sensei highlights him, ?char=sensei also unlocks him (this session only)
  let sel = Math.max(0, ORDER.indexOf(params.get('sel') || params.get('char') || 'tullio'));
  if (params.get('char') && ORDER[sel] === params.get('char')) unlocked[ORDER[sel]] = true;
  const selId = () => ORDER[sel];

  // ------------------------------------------------------------ setup
  const canvas = $('game');
  const renderer = new Q.Renderer(canvas);
  const fx = new Q.FX();
  // which world the attract-mode demo behind the menu shows: the highlighted character, unless he is still locked
  const demoChar = () => (unlocked[selId()] ? selId() : ORDER[0]);
  let world = new Q.World(demoChar());   // in 'menu' this is the attract-mode demo run by the bot
  let mode = 'title';              // title | menu | playing | paused | over
  let hitstop = 0, timeScale = 1;
  let clock = 0, last = 0, musicTick = 0;
  let autoplay = params.has('autoplay');
  const ambient = { puff: 0, dust: 0 };

  // ------------------------------------------------------------ layout
  const app = $('app'), stage = $('stage'), controls = $('controls');
  const mobileLayout = matchMedia('(pointer: coarse), (any-pointer: coarse), (max-width: 700px), (max-width: 960px) and (max-height: 600px)');
  let touchDetected = 'ontouchstart' in window || params.has('touch'); // ?touch forces the phone layout (handy for screenshots)
  let previousPortrait = null;
  function layout() {
    const touch = !params.has('notouch') && (touchDetected || mobileLayout.matches); // ?notouch forces the desktop layout (screenshots)
    document.body.classList.toggle('touch-on', touch);
    const viewport = window.visualViewport;
    const availW = viewport ? viewport.width : window.innerWidth;
    const viewportH = viewport ? viewport.height : window.innerHeight;
    app.style.width = availW + 'px';
    app.style.height = viewportH + 'px';
    const availH = Math.max(1, viewportH - (touch ? 0 : controls.offsetHeight + 14));
    const w = Math.max(1, Math.min(availW, availH * (C.W / C.H)));
    const h = w * C.H / C.W;
    stage.style.width = (touch ? availW : w) + 'px';
    stage.style.height = (touch ? availH : h) + 'px';
    canvas.style.width = w + 'px';
    canvas.style.height = h + 'px';
    stage.style.setProperty('--s', w / 960);
    renderer.resize(w, h);
    // Rotation never leaves an active movement button held or a run playing out of view.
    const portrait = availH > availW;
    if (previousPortrait !== null && previousPortrait !== portrait) {
      Input.clearHeld();
      Input.clearEdges();
      document.querySelectorAll('#touch .down').forEach((button) => button.classList.remove('down'));
    }
    previousPortrait = portrait;
    if (touch && portrait) setPaused(true);
  }
  window.addEventListener('resize', layout);
  window.visualViewport?.addEventListener('resize', layout);
  screen.orientation?.addEventListener('change', () => requestAnimationFrame(layout));
  mobileLayout.addEventListener('change', layout);
  function enableTouch() {
    touchDetected = true;
    if (!document.body.classList.contains('touch-on')) layout();
  }
  window.addEventListener('touchstart', enableTouch, { passive: true, once: true });
  Input.bindTouch($('touch'));
  Input.bindTapJump($('stage'));   // a tap anywhere on the playfield = jump
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
  function drawPowerIcon(kind) { icon(el.powerIcon, (c, s) => { c.scale(s / 52, s / 52); Art.powerBadge(c, kind, 0, world.charId); }); }

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
      if (pt) { const info = Q.powerInfo(world.charId, pt); drawPowerIcon(pt); el.powerLabel.textContent = info.label; el.powerBar.style.background = info.color; }
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
  const screens = { title: $('title'), menu: $('menu'), pause: $('pause'), over: $('over') };
  function show(name) {
    for (const k in screens) screens[k].classList.toggle('hidden', k !== name);
    const playing = mode === 'playing' || mode === 'paused';
    el.hud.classList.toggle('hidden', !(playing || mode === 'over'));
    document.body.classList.toggle('hud-off', mode !== 'playing');
  }

  // ------------------------------------------------------------ character select
  const pickEl = {
    name: $('charName'), aka: $('charAka'), dots: $('charDots'), tips: $('tipsList'), mobileTip: $('mobileTip'), best: $('bestMenu'),
    lock: $('lockOverlay'), portrait: $('portrait'), cv: $('portraitCv'), play: $('playBtn'),
  };
  const pcx = pickEl.cv.getContext('2d');
  const ghost = document.createElement('canvas'); ghost.width = pickEl.cv.width; ghost.height = pickEl.cv.height; // for the locked silhouette
  ORDER.forEach(() => pickEl.dots.appendChild(document.createElement('i')));

  /** Retrigger a one-shot CSS animation class on an element. */
  function kick(node, cls) { node.classList.remove(cls); void node.offsetWidth; node.classList.add(cls); }

  function renderPicker(dir) {
    const id = selId(), ch = Q.CHARS[id], open = unlocked[id];
    pickEl.name.textContent = ch.name;
    pickEl.aka.textContent = open ? ch.aka : 'finisci una partita con Tullio';
    pickEl.tips.innerHTML = ch.tips.map((t) => '<li>' + t + '</li>').join('');
    pickEl.mobileTip.textContent = ch.mobileTip;
    pickEl.best.textContent = bests[id].toLocaleString('en-US');
    pickEl.lock.classList.toggle('hidden', open);
    pickEl.play.classList.toggle('locked', !open);
    pickEl.play.textContent = open ? '▶ PLAY' : '🔒 BLOCCATO';
    [...pickEl.dots.children].forEach((d, i) => { d.classList.toggle('on', i === sel); d.classList.toggle('lk', !unlocked[ORDER[i]]); });
    if (dir) { pickEl.portrait.classList.remove('slide-l', 'slide-r'); kick(pickEl.portrait, dir > 0 ? 'slide-r' : 'slide-l'); }
    // the attract-mode demo behind the panel follows the highlighted character
    if (mode === 'menu' && world.charId !== demoChar()) { world = new Q.World(demoChar()); fx.reset(); }
  }
  function changeChar(dir) {
    if (mode !== 'menu') return;
    sel = (sel + dir + ORDER.length) % ORDER.length;
    Sfx.resume(); Sfx.play('ui');
    renderPicker(dir);
  }

  /** Draw the highlighted character (running on the spot) into the portrait; a black silhouette while he is locked. */
  function drawPortrait(time) {
    const id = selId(), open = unlocked[id], W = pickEl.cv.width, Hh = pickEl.cv.height;
    pcx.setTransform(1, 0, 0, 1, 0, 0); pcx.clearRect(0, 0, W, Hh);
    const target = open ? pcx : ghost.getContext('2d');
    if (!open) { target.setTransform(1, 0, 0, 1, 0, 0); target.clearRect(0, 0, W, Hh); }
    // ground shadow
    pcx.fillStyle = 'rgba(0,0,0,0.25)'; pcx.beginPath(); pcx.ellipse(W / 2, Hh * 0.66 + 6, W * 0.2, 9, 0, 0, 7); pcx.fill();
    target.save(); target.lineCap = 'round'; target.lineJoin = 'round';
    target.translate(W / 2 - 4, Hh * 0.66); const k = W / 120; target.scale(k, k);
    const base = { t: time, mode: 'run', air: false, vy: 0, expr: open ? 'happy' : 'normal', blink: (time % 3.4) < 0.12, runRate: 9 };
    if (id === 'sensei') Art.sensei(target, base); else Art.hero(target, base);
    target.restore();
    if (!open) { // silhouette: keep the shape, paint it dark
      target.globalCompositeOperation = 'source-in'; target.fillStyle = '#10142a'; target.fillRect(0, 0, W, Hh); target.globalCompositeOperation = 'source-over';
      pcx.globalAlpha = 0.92; pcx.drawImage(ghost, 0, 0); pcx.globalAlpha = 1;
    }
  }

  // ------------------------------------------------------------ flow
  function toMenu() {
    Sfx.play('ui'); Sfx.stopMusic(); Sfx.setEngine(false);
    mode = 'menu'; world = new Q.World(demoChar()); fx.reset(); renderPicker(0); show('menu');
  }
  /** Title screen → character select (any key / click / tap). */
  function leaveTitle() {
    if (mode !== 'title') return;
    Sfx.resume(); Sfx.play('ui');
    mode = 'menu'; world = new Q.World(demoChar()); fx.reset(); renderPicker(0); show('menu');
  }

  function startGame() {
    if (mode === 'menu' && !unlocked[selId()]) { // the Sensei is still locked: "non sei ancora degno"
      Sfx.resume(); Sfx.play('empty'); kick(pickEl.play, 'shake'); kick(pickEl.portrait, 'shake'); return;
    }
    Sfx.resume(); Sfx.play('ui');
    world = new Q.World(selId()); fx.reset();
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
    else if (!p && mode === 'paused') { mode = 'playing'; show(null); Sfx.play('pause'); Sfx.startMusic(); if (world.power.type === 'bike' && world.charId !== 'sensei') Sfx.setEngine(true, world.speedMul); Input.clearEdges(); }
  }
  function gameOver() {
    mode = 'over';
    const id = world.charId, ch = Q.CHARS[id];
    const isBest = world.score > bests[id];
    if (isBest) { bests[id] = world.score; store.set('game21.best.' + id, bests[id]); }
    // finishing a run with Tullio is what makes the Sensei worthy
    let justUnlocked = false;
    if (id === ORDER[0]) ORDER.forEach((o) => { if (!unlocked[o]) { unlocked[o] = true; store.set('game21.unlocked.' + o, '1'); justUnlocked = true; } });
    $('finalScore').textContent = world.score.toLocaleString('en-US');
    $('finalMoney').textContent = '€' + world.money;
    $('finalDist').textContent = Math.floor(world.meters) + ' m';
    $('finalBest').textContent = bests[id].toLocaleString('en-US');
    $('newBest').classList.toggle('hidden', !isBest);
    $('unlockNote').classList.toggle('hidden', !justUnlocked);
    $('quip').textContent = U.pick(ch.quips);
    pickEl.best.textContent = bests[selId()].toLocaleString('en-US');
    show('over');
  }

  // Buttons must never keep keyboard focus: otherwise SPACE (jump) would "click" the last-pressed button again.
  document.addEventListener('click', (e) => { const b = e.target.closest && e.target.closest('button'); if (b) b.blur(); });
  $('menuBtn1').addEventListener('click', toMenu);
  $('menuBtn2').addEventListener('click', toMenu);
  $('playBtn').addEventListener('click', startGame);
  $('prevChar').addEventListener('click', () => changeChar(-1));
  $('nextChar').addEventListener('click', () => changeChar(1));
  pickEl.portrait.addEventListener('click', () => changeChar(1));
  $('title').addEventListener('click', leaveTitle);
  $('logo').addEventListener('error', () => $('title').classList.add('no-logo')); // no logo.png next to index.html: fall back to text
  $('resumeBtn').addEventListener('click', () => setPaused(false));
  $('restartBtn1').addEventListener('click', startGame);
  $('restartBtn2').addEventListener('click', startGame);
  $('pauseBtn').addEventListener('click', () => setPaused(mode === 'playing'));
  $('muteBtn').addEventListener('click', toggleMute);
  function toggleMute() { Sfx.resume(); Sfx.setMuted(!Sfx.muted); $('muteBtn').textContent = Sfx.muted ? '✕' : '♪'; }
  Input.on('mute', toggleMute);
  Input.on('pause', () => { if (mode === 'playing') setPaused(true); else if (mode === 'paused') setPaused(false); });
  Input.on('confirm', () => { if (mode === 'title') leaveTitle(); else if (mode === 'menu' || mode === 'over') startGame(); else if (mode === 'paused') setPaused(false); });
  Input.on('jump', () => { if (mode === 'title') leaveTitle(); });
  Input.on('left', () => changeChar(-1));
  Input.on('right', () => changeChar(1));
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
        const sen = world.charId === 'sensei', info = Q.powerInfo(world.charId, e.kind);
        Sfx.play(e.kind === 'pencil' ? 'scribble' : 'power'); fx.doFlash(info.color, 0.35);
        banner(world.char.banners[e.kind], e.kind === 'skis' ? 'teal' : e.kind === 'shield' ? (sen ? 'red' : 'gold') : e.kind === 'pencil' || (sen && e.kind === 'bike') ? 'pink' : '');
        if (e.kind === 'shield') fx.text(p.x, p.y - 100, sen ? 'Compagni, avanti!' : 'Forza Roma!', { color: sen ? '#ffd23f' : '#f7c52b', size: 22, life: 1.4 });
        if (e.kind === 'pencil') fx.text(p.x + 10, p.y - 100, 'Buca tutto!', { color: '#ff9ec4', size: 22, life: 1.4 });
        if (sen && e.kind === 'sword') fx.text(p.x + 10, p.y - 100, 'Fatti sotto!', { color: '#ffd166', size: 22, life: 1.4 });
        if (sen && e.kind === 'bike') { Sfx.play('giggle'); fx.text(p.x + 30, p.y - 100, 'Cecilia', { color: '#ff9ec4', size: 30, life: 2 }); }
        fx.burst(p.x, p.y - 30, { n: 22, color: [info.color, '#fff'], shape: 'star', min: 80, max: 320, life: 0.7, size: 5, grav: 100 });
        if (e.kind === 'bike' && !sen) Sfx.setEngine(true, world.speedMul); // the Vespa has an engine; the passeggino doesn't
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
        if (e.skate != null) { // the ice rink: "tavola d'acqua"
          if (e.skate) { Sfx.play('iceEnter'); banner("TAVOLA D'ACQUA!", 'teal'); }
          fx.text(e.x, e.y - 52, e.skate ? 'PATTINI!' : 'VIA I PATTINI!', { color: e.skate ? '#8fe3f7' : '#ffd166', size: 18, life: 0.9 });
        } else fx.text(e.x, e.y - 52, e.swim ? 'COSTUME!' : 'VIA IL COSTUME!', { color: e.swim ? '#8fe3f7' : '#ffd166', size: 18, life: 0.9 });
        break;
      case 'stroke': Sfx.play('stroke'); fx.burst(e.x, e.y - 6, { n: 4, color: ['#fff', '#8fe3f7'], shape: 'dot', size: 3, min: 30, max: 110, dir: Math.PI / 2, spread: 0.8, life: 0.5, grav: -60 }); break;
      case 'throw': Sfx.play('throw'); break;
      case 'empty': Sfx.play('empty'); break;
      case 'paper_hit': Sfx.play('hitEnemy'); fx.burst(e.x, e.y, { n: 8, color: ['#fffef7', '#5a8cff'], shape: 'sq', min: 80, max: 260, life: 0.5, size: 4, grav: 400 }); break;
      case 'enemy_hit': {
        fx.burst(e.x, e.y, { n: 7, color: ['#ffd166', '#fff'], shape: 'star', min: 80, max: 240, life: 0.4, size: 5, grav: 200 });
        fx.doShake(4); hitstop = Math.max(hitstop, 0.04);
        if (e.kind === 'oldman') Sfx.play('grumble');
        break;
      }
      case 'speech':
        fx.bubble(e.x, e.y, e.text, e.who === 'sensei' ? 2.2 : 1.3, e.who, e.shout);
        if (e.who === 'oldman') Sfx.say(e.text, { rate: 1.08, pitch: 0.8, soft: true }); // his catchphrases, out loud
        if (e.who === 'sensei') Sfx.say(e.text.toLowerCase(), { rate: 0.92, pitch: 0.55 });   // "avete fatto di testa vostra"
        if (e.who === 'hall') Sfx.say(e.text, { rate: 1, pitch: 1.05, soft: true, lang: 'en-GB' }); // Mr. Hall: "Modifica painful", "as is"
        break;
      case 'squeak': Sfx.play('squeak'); fx.text(e.x, e.y - 30, 'SQUIK!', { color: '#ffd166', size: 15, life: 0.6 }); break;
      case 'hiss': Sfx.play('hiss'); fx.text(e.x, e.y - 30, 'HSSS!', { color: '#c6ef4a', size: 15, life: 0.6 }); break;
      case 'kill': {
        hitstop = Math.max(hitstop, 0.07); fx.doShake(e.src === 'bomb' ? 8 : 9);
        Sfx.play('kill');
        fx.text(e.x, e.y - 26, '+' + e.pts, { color: '#ffd166', size: 24, life: 1 });
        if (e.kind === 'oldman') {
          fx.text(e.x, e.y - 70, 'GAME_21 ∎', { color: '#fff', size: 30, life: 1.4, vy: -30 });
          fx.burst(e.x, e.y, { n: 14, color: '#fffef7', shape: 'paper', size: 8, min: 80, max: 360, life: 1.2, grav: 300 });
          fx.burst(e.x, e.y, { n: 16, color: '#f6f5ef', shape: 'feather', size: 9, min: 80, max: 300, life: 1, grav: 150 }); // beard hair
          fx.burst(e.x, e.y, { n: 10, color: ['#ffd166', '#fff'], shape: 'star', size: 6, min: 100, max: 360, life: 0.7, grav: 100 });
          fx.parts.push({ x: e.x, y: e.y - 40, vx: -160, vy: -520, life: 1.4, max: 1.4, size: 8, color: '#000', shape: 'glasses', grav: 1300, drag: 0, rot: 0, vr: 10 });
        } else if (e.kind === 'hall') { // Mr. Hall: his papers fly, the glasses and the red pen go flying
          fx.burst(e.x, e.y, { n: 16, color: '#fffef7', shape: 'paper', size: 8, min: 80, max: 360, life: 1.2, grav: 300 });
          fx.burst(e.x, e.y, { n: 10, color: ['#e63946', '#fff'], shape: 'chip', size: 7, min: 100, max: 340, life: 0.9, grav: 400 });
          fx.burst(e.x, e.y, { n: 10, color: ['#ffd166', '#fff'], shape: 'star', size: 6, min: 100, max: 360, life: 0.7, grav: 100 });
          fx.parts.push({ x: e.x, y: e.y - 40, vx: -160, vy: -520, life: 1.4, max: 1.4, size: 8, color: '#a9d4f0', shape: 'glasses', grav: 1300, drag: 0, rot: 0, vr: 10 });
        } else if (e.kind === 'cat') {
          if (e.src === 'pencil') { Sfx.play('pierce'); fx.text(e.x - 30, e.y - 70, 'BESTIACCIA!', { color: '#ff9ec4', size: 26, life: 1.2 }); }
          else fx.text(e.x, e.y - 70, 'MIAO?!', { color: '#c6ef4a', size: 22, life: 1.1 });
          fx.burst(e.x, e.y, { n: 12, color: ['#1b1b22', '#f7f7f7'], shape: 'feather', size: 7, min: 80, max: 280, life: 0.9, grav: 200 });
          fx.burst(e.x, e.y, { n: 6, color: ['#ffd166', '#fff'], shape: 'star', size: 5, min: 100, max: 300, life: 0.6, grav: 100 });
        } else if (e.kind === 'chip') {
          if (e.src === 'pencil') { Sfx.play('pierce'); fx.text(e.x - 30, e.y - 60, 'BESTIACCIA!', { color: '#ff9ec4', size: 24, life: 1.2 }); }
          else fx.text(e.x, e.y - 56, e.who === 'ciop' ? 'CIOP!' : 'CIP!', { color: '#ffd166', size: 22, life: 1.1 });
          fx.burst(e.x, e.y, { n: 12, color: ['#b87333', '#f6e3bf', '#6e3f1a'], shape: 'feather', size: 6, min: 80, max: 280, life: 0.9, grav: 200 });
          fx.burst(e.x, e.y, { n: 6, color: ['#ffd166', '#fff'], shape: 'star', size: 5, min: 100, max: 300, life: 0.6, grav: 100 });
        }
        break;
      }
      case 'stomp': Sfx.play('stomp'); fx.text(e.x, e.y - 24, 'BOING!', { color: '#fff', size: 18, life: 0.6 }); break;
      case 'smash':
        Sfx.play(e.src === 'pencil' ? 'pierce' : world.charId === 'sensei' && world.power.type === 'sword' ? 'whack' : 'smash'); fx.doShake(e.src === 'pencil' ? 3 : 5);
        fx.burst(e.x, e.y, { n: 12, color: e.kind === 'cone' ? ['#ff8a3d', '#fff'] : e.kind === 'buoy' ? ['#ff4d4d', '#fff'] : e.kind === 'wing' ? ['#e6e8ec', '#fff', '#8a93a3', '#1c2033'] : ['#3a86ff', '#ef476f', '#06d6a0', '#fff'], shape: 'sq', size: 6, min: 100, max: 340, life: 0.7, grav: 700 });
        if (e.src === 'pencil') { // pencil shavings + graphite dust
          fx.burst(e.x, e.y, { n: 8, color: ['#ffd23f', '#f2c999', '#2b2f3f'], shape: 'chip', size: 6, min: 120, max: 360, life: 0.7, grav: 500 });
          fx.text(e.x, e.y - 30, 'SPUNTITO!', { color: '#ff9ec4', size: 18, life: 0.8 }); // the pencil gets blunted
        }
        break;
      // RSE meteorite
      case 'meteor_warn': Sfx.play('meteorWarn'); banner('METEORITE!', 'red'); fx.text(e.x, e.y - 40, '⚠ RSE ⚠', { color: '#ff5c6c', size: 20, life: 1.1 }); break;
      case 'meteor_impact':
        Sfx.play('meteorBoom'); fx.doShake(e.ground ? 20 : 12); hitstop = Math.max(hitstop, 0.06);
        if (e.ground) fx.doFlash('#ff9a3d', 0.5);
        for (let i = 0; i < 3; i++) fx.ring(e.x, e.y, i % 2 ? '#ffd166' : '#ff6b3d', 18 + i * 20, 0.45 + i * 0.1);
        fx.burst(e.x, e.y, { n: 30, color: ['#ff6b3d', '#ffd166', '#fff', '#ffb703'], shape: 'star', size: 7, min: 140, max: 560, life: 0.9, grav: 400 });
        fx.burst(e.x, e.y, { n: 12, color: ['#5f4a3a', '#3a2a22'], shape: 'sq', size: 7, min: 120, max: 460, life: 0.9, grav: 900 });
        fx.burst(e.x, e.y, { n: 14, color: 'rgba(50,40,45,0.7)', shape: 'smoke', size: 12, min: 40, max: 220, life: 1.1, grav: -50, grow: 30 });
        break;
      case 'meteor_smash':
        Sfx.play('smash'); fx.doShake(8);
        fx.burst(e.x, e.y, { n: 18, color: ['#5f4a3a', '#ff9a3d', '#ffd166'], shape: 'sq', size: 6, min: 120, max: 420, life: 0.7, grav: 700 });
        fx.text(e.x, e.y - 30, '+' + C.SCORE.meteor + ' RSE!', { color: '#ffd166', size: 20, life: 0.9 });
        break;
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
      case 'oldman_leave': if (e.who !== 'hall') fx.bubble(e.x, e.y, 'Mah! Ci rinuncio.', 1.4); break;
      case 'enemy_spawn':
        if (e.kind === 'oldman') { banner('FRANCONE!', 'red'); Sfx.play('grumble'); }
        else if (e.kind === 'hall') { banner('MR. HALL!', 'red'); Sfx.play('warn'); }
        else if (e.kind === 'cat') { banner('FIGARO!', ''); }
        else if (e.kind === 'chip') { banner('CIP E CIOP!', ''); }
        break;
      case 'gameover': gameOver(); break;
    }
  }

  /** Continuous ambient effects (exhaust, snow spray, sword sparkles, running dust). */
  function ambientFx(w, dt) {
    const p = w.player, t = w.power.type;
    // sparks and smoke behind every falling meteorite
    for (const m of w.meteors) {
      if (m.state !== 'fall') continue;
      fx.burst(m.x, m.y, { n: 2, color: ['#ffb703', '#ff6b3d', 'rgba(90,70,60,0.8)'], shape: 'dot', size: 4, min: 20, max: 90, dir: Math.atan2(-m.vy, -m.vx), spread: 0.5, life: 0.45, grav: 40 });
    }
    if (p.dead) return;
    if (p.skate && p.onGround) { // blades on the ice: a fine white spray, more of it the faster he glides sideways
      ambient.ice = (ambient.ice || 0) - dt;
      if (ambient.ice <= 0) { ambient.ice = 0.05; const sp = Math.min(1, Math.abs(p.vx) / 150); fx.burst(p.x - 6, p.y - 1, { n: 1 + Math.round(sp * 2), color: ['#fff', '#d9f3ff'], shape: 'dot', size: 2.4, min: 30, max: 90 + sp * 120, dir: p.vx > 0 ? Math.PI + 0.35 : -0.35, spread: 0.5, life: 0.4, grav: 160 }); }
    }
    if (t === 'pencil' && p.onGround && !p.swim) {
      ambient.puff -= dt;
      if (ambient.puff <= 0) { ambient.puff = 0.07; fx.burst(p.x + 58, p.y - 21, { n: 1, color: ['#2b2f3f', '#8c8f9c'], shape: 'dot', size: 2.4, min: 20, max: 80, dir: -0.4, spread: 0.6, life: 0.4, grav: 200 }); }
    } else if (t === 'bike') {
      ambient.puff -= dt;
      if (w.charId === 'sensei') { if (ambient.puff <= 0 && p.onGround) { ambient.puff = 0.06; fx.burst(p.x - 60, p.y - 3, { n: 1, color: 'rgba(255,255,255,0.6)', shape: 'dot', size: 2.6, min: 20, max: 90, dir: Math.PI + 0.3, spread: 0.5, life: 0.4, grav: -10 }); } }
      else if (ambient.puff <= 0) { ambient.puff = 0.045; fx.burst(p.x - 46, p.y - 13, { n: 1, color: 'rgba(210,214,224,0.8)', shape: 'smoke', size: 5, min: 20, max: 70, dir: Math.PI, spread: 0.3, life: 0.45, grav: -30, grow: 14 }); }
      if (w.charId !== 'sensei') Sfx.setEngine(true, w.speedMul);
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
    if (mode === 'title') return; // the logo screen is static HTML: nothing to simulate or draw underneath

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
        if (mode === 'menu') { /* attract mode is silent */ for (const e of evs) if (e.type !== 'gameover') visualOnly(e); if (world.over) world = new Q.World(demoChar()); }
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
    if (mode === 'menu') drawPortrait(clock);
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
  Q.game = {
    get world() { return world; }, fx, renderer, get mode() { return mode; }, startGame, tick, toMenu, leaveTitle, changeChar,
    get selected() { return selId(); }, unlocked, bests,
  };
  layout();
  renderPicker(0);
  if (autoplay || params.has('start')) startGame();
  else if (params.has('menu')) { mode = 'menu'; world = new Q.World(demoChar()); renderPicker(0); show('menu'); }
  else show('title');
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
    if (params.has('ice')) { world.ice.push({ x: 20, w: 1500 }); step(parseFloat(params.get('ice')) || 1.0); }
    if (params.has('chips')) { world.spawnChips(); step(parseFloat(params.get('chips')) || 1.4); }
    if (params.has('oldman')) { world.spawnOldMan(); step(parseFloat(params.get('oldman')) || 2.6); }
    if (params.has('hall')) { world.spawnHall(); step(parseFloat(params.get('hall')) || 2.6); }
    if (params.has('cat')) { world.spawnCat(); step(parseFloat(params.get('cat')) || 1.2); }
    if (params.has('meteor')) { world.spawnMeteor(); step(parseFloat(params.get('meteor')) || 0.6); }
    if (params.has('bomb')) {
      world.spawnOldMan(); world.spawnCat(); step(2.4);
      world.bombs = 1; step(1 / 60, { left: false, right: false, down: false, jumpHeld: false, jumpPressed: false, throwPressed: false, bombPressed: true });
      step(parseFloat(params.get('bomb')) || 0.55);
    }
    fx.reset();
    // &hit: Francone takes a paper right now (shows his speech bubble)
    if (params.has('hit')) {
      const old = world.enemies.find((o) => (o.kind === 'oldman' || o.kind === 'hall') && !o.dead);
      if (old) { world.damageEnemy(old, 1, 'paper'); const evs = world.events; world.events = []; evs.forEach(handle); step(0.15); fx.bubbles.forEach((b) => (b.life = 99)); }
    }
  }
  requestAnimationFrame((t) => { last = t; frame(t); });
})();
