/* QED RUN — shared constants. Pure data, no DOM. */
(function () {
  const Q = (globalThis.Q = globalThis.Q || {});

  Q.C = {
    // logical canvas
    W: 960,
    H: 540,
    GROUND: 452,

    // player physics
    GRAVITY: 2300,
    JUMP_V: 800,
    AIR_JUMP_V: 720,
    CUT_V: 260,
    MAX_FALL: 1100,
    COYOTE: 0.1,
    JUMP_BUF: 0.12,
    MOVE: 300,
    X_MIN: 40,
    X_MAX: 620,

    // world speed (px/s). Ramps asymptotically from BASE to MAX.
    BASE_SPEED: 290,
    MAX_SPEED: 640,
    RAMP: 75,
    PX_PER_M: 50,

    // resources
    MAX_HEARTS: 3,
    START_AMMO: 3,
    MAX_AMMO: 12,
    START_BOMBS: 1,
    MAX_BOMBS: 3,
    SHOT_SPEED: 780,
    SHOT_CD: 0.2,
    BOMB_FUSE: 0.28,
    BOMB_R: 700,

    POWER: {
      bike: { dur: 9, mul: 1.65, label: 'VESPA', color: '#f4a261' },
      skis: { dur: 9, mul: 1.4, label: 'SKIS', color: '#4cc9f0' },
      sword: { dur: 7, mul: 1.3, label: 'SWORD', color: '#ffd166' },
      // Scudetto giallorosso: nothing you run into can hurt you
      shield: { dur: 10, mul: 1.12, label: 'SCUDETTO', color: '#f0b429' },
      // Matita: a pencil sticks out of the hips and pierces every obstacle (cones, books, buoys)
      pencil: { dur: 8, mul: 1.2, label: 'MATITA', color: '#ff8fb8' },
    },

    // RSE meteorite: telegraphed from the sky, aimed at the hero's position
    METEOR: { R: 27, BLAST: 48, BLAST_T: 0.16 },

    // swimming (water passages)
    SWIM_G: 1250,
    SWIM_STROKE: 500,
    SWIM_MAX_FALL: 520,
    SWIM_COOLDOWN: 0.2,

    SCORE: { coin: 10, note: 60, oldman: 300, cat: 200, smash: 15, heart: 100, meteor: 50 },
  };
})();
