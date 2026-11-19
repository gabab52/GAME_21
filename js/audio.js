/* Procedural sound: every effect and the music loop are synthesised with WebAudio (no asset files). */
(function () {
  const Q = (globalThis.Q = globalThis.Q || {});

  let ctx = null, master = null, sfxBus = null, musicBus = null;
  let muted = false;
  let musicTimer = null, step = 0, nextT = 0, tempo = 124, musicOn = false;
  let engine = null;

  function init() {
    if (ctx) return;
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    master = ctx.createGain();
    master.gain.value = muted ? 0 : 0.7;
    master.connect(ctx.destination);
    sfxBus = ctx.createGain(); sfxBus.gain.value = 0.55; sfxBus.connect(master);
    musicBus = ctx.createGain(); musicBus.gain.value = 0.16; musicBus.connect(master);
  }
  function resume() { init(); if (ctx && ctx.state === 'suspended') ctx.resume(); }

  function tone(o) {
    if (!ctx) return;
    const t0 = ctx.currentTime + (o.delay || 0);
    const osc = ctx.createOscillator();
    const g = ctx.createGain();
    osc.type = o.type || 'square';
    osc.frequency.setValueAtTime(o.f, t0);
    if (o.f2) osc.frequency.exponentialRampToValueAtTime(Math.max(1, o.f2), t0 + o.t);
    const v = o.vol == null ? 0.25 : o.vol;
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(v, t0 + (o.a || 0.006));
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.t);
    osc.connect(g); g.connect(o.bus || sfxBus);
    osc.start(t0); osc.stop(t0 + o.t + 0.05);
  }

  function noise(o) {
    if (!ctx) return;
    const t0 = ctx.currentTime + (o.delay || 0);
    const len = Math.max(1, Math.floor(ctx.sampleRate * o.t));
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const src = ctx.createBufferSource(); src.buffer = buf;
    const f = ctx.createBiquadFilter();
    f.type = o.filter || 'lowpass';
    f.frequency.setValueAtTime(o.f || 1200, t0);
    if (o.f2) f.frequency.exponentialRampToValueAtTime(Math.max(20, o.f2), t0 + o.t);
    const g = ctx.createGain();
    g.gain.setValueAtTime(o.vol == null ? 0.4 : o.vol, t0);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + o.t);
    src.connect(f); f.connect(g); g.connect(sfxBus);
    src.start(t0);
  }

  const N = (semi) => 440 * Math.pow(2, (semi - 9) / 12); // semitone 0 = C4

  const FX = {
    jump() { tone({ f: 300, f2: 620, t: 0.14, type: 'square', vol: 0.16 }); },
    djump() { tone({ f: 450, f2: 900, t: 0.16, type: 'triangle', vol: 0.22 }); },
    land() { noise({ t: 0.06, f: 500, vol: 0.12 }); },
    coin() { tone({ f: N(19), t: 0.07, type: 'square', vol: 0.14 }); tone({ f: N(26), t: 0.16, type: 'square', vol: 0.14, delay: 0.06 }); },
    note() { [19, 23, 26, 31].forEach((s, i) => tone({ f: N(s), t: 0.12, type: 'triangle', vol: 0.2, delay: i * 0.055 })); },
    paper() { tone({ f: 700, f2: 1100, t: 0.09, type: 'sine', vol: 0.18 }); noise({ t: 0.08, f: 3500, filter: 'highpass', vol: 0.15, delay: 0.02 }); },
    throw() { noise({ t: 0.16, f: 2500, f2: 700, filter: 'bandpass', vol: 0.35 }); },
    empty() { tone({ f: 120, t: 0.06, type: 'square', vol: 0.12 }); },
    hitEnemy() { noise({ t: 0.1, f: 1800, filter: 'bandpass', vol: 0.3 }); tone({ f: 260, f2: 140, t: 0.12, type: 'square', vol: 0.18 }); },
    hurt() { tone({ f: 330, f2: 70, t: 0.35, type: 'sawtooth', vol: 0.3 }); noise({ t: 0.22, f: 900, vol: 0.3 }); },
    kill() { [0, 4, 7, 12].forEach((s, i) => tone({ f: N(12 + s), t: 0.1, type: 'square', vol: 0.18, delay: i * 0.05 })); },
    stomp() { tone({ f: 200, f2: 500, t: 0.1, type: 'square', vol: 0.25 }); noise({ t: 0.06, f: 1500, vol: 0.2 }); },
    smash() { noise({ t: 0.22, f: 1400, f2: 200, vol: 0.45 }); tone({ f: 140, f2: 50, t: 0.2, type: 'sawtooth', vol: 0.25 }); },
    pickup() { [12, 16, 19].forEach((s, i) => tone({ f: N(s), t: 0.1, type: 'triangle', vol: 0.22, delay: i * 0.06 })); },
    heart() { [14, 18, 21, 26].forEach((s, i) => tone({ f: N(s), t: 0.14, type: 'sine', vol: 0.3, delay: i * 0.07 })); },
    power() { for (let i = 0; i < 6; i++) tone({ f: N(7 + i * 3), t: 0.09, type: 'square', vol: 0.16, delay: i * 0.05 }); },
    powerEnd() { tone({ f: 500, f2: 120, t: 0.4, type: 'sawtooth', vol: 0.2 }); },
    warn() { tone({ f: 180, t: 0.12, type: 'sawtooth', vol: 0.25 }); tone({ f: 150, t: 0.18, type: 'sawtooth', vol: 0.25, delay: 0.14 }); },
    chomp() { noise({ t: 0.08, f: 700, vol: 0.4 }); tone({ f: 90, f2: 50, t: 0.18, type: 'square', vol: 0.3 }); },
    meow() { tone({ f: 600, f2: 950, t: 0.14, type: 'triangle', vol: 0.25 }); tone({ f: 950, f2: 480, t: 0.28, type: 'triangle', vol: 0.25, delay: 0.14 }); },
    hiss() { noise({ t: 0.3, f: 5000, filter: 'highpass', vol: 0.25 }); },
    grumble() { tone({ f: 110, f2: 80, t: 0.3, type: 'sawtooth', vol: 0.2 }); tone({ f: 95, f2: 70, t: 0.3, type: 'sawtooth', vol: 0.2, delay: 0.1 }); },
    bombArm() { for (let i = 0; i < 5; i++) tone({ f: 900 - i * 90, t: 0.07, type: 'square', vol: 0.15, delay: i * 0.055 }); },
    bombBlast() {
      noise({ t: 1.1, f: 2200, f2: 60, vol: 0.9 });
      tone({ f: 120, f2: 28, t: 0.9, type: 'sawtooth', vol: 0.55 });
      // sad trombone: "va tutto male…"
      [[N(2), 0.28], [N(1), 0.28], [N(0), 0.28], [N(-1), 0.9]].reduce((d, [f, len], i) => {
        tone({ f: f, f2: i === 3 ? f * 0.93 : f, t: len, type: 'sawtooth', vol: 0.2, delay: 0.25 + d, a: 0.04 });
        return d + len;
      }, 0);
    },
    gameover() { [7, 4, 2, 0].forEach((s, i) => tone({ f: N(s), t: 0.28, type: 'triangle', vol: 0.3, delay: i * 0.2 })); },
    ui() { tone({ f: N(12), t: 0.06, type: 'square', vol: 0.14 }); tone({ f: N(19), t: 0.08, type: 'square', vol: 0.14, delay: 0.05 }); },
    shield() { tone({ f: N(19), t: 0.09, type: 'square', vol: 0.2 }); tone({ f: N(24), t: 0.2, type: 'triangle', vol: 0.3, delay: 0.04 }); noise({ t: 0.1, f: 4000, filter: 'highpass', vol: 0.18 }); },
    splash() { noise({ t: 0.35, f: 3000, f2: 500, filter: 'bandpass', vol: 0.45 }); tone({ f: 420, f2: 160, t: 0.18, type: 'sine', vol: 0.2 }); },
    stroke() { noise({ t: 0.18, f: 1500, f2: 400, filter: 'lowpass', vol: 0.22 }); tone({ f: 260, f2: 420, t: 0.12, type: 'sine', vol: 0.14 }); },
    pop() { tone({ f: 500, f2: 1200, t: 0.1, type: 'sine', vol: 0.3 }); noise({ t: 0.12, f: 5000, filter: 'highpass', vol: 0.2 }); [12, 19, 24].forEach((s, i) => tone({ f: N(s), t: 0.08, type: 'square', vol: 0.12, delay: 0.08 + i * 0.05 })); },
    pause() { tone({ f: N(7), t: 0.08, type: 'square', vol: 0.14 }); },
  };

  function play(name) {
    if (muted || !ctx) return;
    const fn = FX[name];
    if (fn) fn();
  }

  function say(text) {
    try {
      if (muted || !window.speechSynthesis) return;
      const u = new SpeechSynthesisUtterance(text);
      u.lang = 'it-IT'; u.rate = 0.85; u.pitch = 0.5; u.volume = 1;
      window.speechSynthesis.cancel();
      window.speechSynthesis.speak(u);
    } catch (_) {}
  }

  // --- music: a bouncy minor-pentatonic bass + lead loop whose tempo follows difficulty ---
  const BASS = [0, 0, 7, 0, 5, 5, 3, 5, 0, 0, 7, 0, 10, 8, 7, 5];
  const LEAD = [12, null, 15, 12, 17, null, 15, null, 12, 15, 19, null, 17, 15, 12, null,
                12, null, 15, 12, 19, null, 17, 15, 14, null, 12, null, 10, null, 12, null];
  function schedule() {
    if (!ctx || !musicOn) return;
    const spb = 60 / tempo / 2; // eighth notes
    while (nextT < ctx.currentTime + 0.25) {
      const i = step % 32;
      const bt = BASS[Math.floor(i / 2) % 16];
      const when = Math.max(0, nextT - ctx.currentTime);
      if (i % 2 === 0) tone({ f: N(bt - 12), t: spb * 1.6, type: 'triangle', vol: 0.9, delay: when, bus: musicBus });
      const l = LEAD[i];
      if (l != null) tone({ f: N(l), t: spb * 0.9, type: 'square', vol: 0.35, delay: when, bus: musicBus });
      if (i % 4 === 2) noise2(when, spb * 0.3);
      nextT += spb; step++;
    }
  }
  function noise2(delay, t) { // hi-hat on the music bus
    const len = Math.floor(ctx.sampleRate * t);
    const buf = ctx.createBuffer(1, len, ctx.sampleRate);
    const d = buf.getChannelData(0);
    for (let i = 0; i < len; i++) d[i] = Math.random() * 2 - 1;
    const s = ctx.createBufferSource(); s.buffer = buf;
    const f = ctx.createBiquadFilter(); f.type = 'highpass'; f.frequency.value = 6000;
    const g = ctx.createGain(); g.gain.setValueAtTime(0.25, ctx.currentTime + delay);
    g.gain.exponentialRampToValueAtTime(0.0001, ctx.currentTime + delay + t);
    s.connect(f); f.connect(g); g.connect(musicBus); s.start(ctx.currentTime + delay);
  }

  function setEngine(on, speed) {
    if (!ctx) return;
    if (on && !engine) {
      const o = ctx.createOscillator(), g = ctx.createGain(), lfo = ctx.createOscillator(), lg = ctx.createGain();
      o.type = 'sawtooth'; o.frequency.value = 62;
      lfo.frequency.value = 22; lg.gain.value = 9; lfo.connect(lg); lg.connect(o.frequency);
      g.gain.value = 0.0001; g.gain.linearRampToValueAtTime(0.11, ctx.currentTime + 0.3);
      o.connect(g); g.connect(sfxBus); o.start(); lfo.start();
      engine = { o, g, lfo };
    } else if (!on && engine) {
      const e = engine; engine = null;
      e.g.gain.cancelScheduledValues(ctx.currentTime);
      e.g.gain.linearRampToValueAtTime(0.0001, ctx.currentTime + 0.25);
      e.o.stop(ctx.currentTime + 0.3); e.lfo.stop(ctx.currentTime + 0.3);
    }
    if (engine && speed) engine.o.frequency.setTargetAtTime(55 + speed * 22, ctx.currentTime, 0.1);
  }

  Q.Sfx = {
    init, resume, play, say, setEngine,
    get muted() { return muted; },
    setMuted(m) {
      muted = m;
      if (master) master.gain.value = m ? 0 : 0.7;
      if (m) { try { window.speechSynthesis && window.speechSynthesis.cancel(); } catch (_) {} }
    },
    startMusic() {
      resume();
      if (!ctx || musicOn) return;
      musicOn = true; step = 0; nextT = ctx.currentTime + 0.1;
      musicTimer = setInterval(schedule, 80);
    },
    stopMusic() { musicOn = false; clearInterval(musicTimer); musicTimer = null; },
    setTempo(bpm) { tempo = bpm; },
  };
})();
