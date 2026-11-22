/* GAME_21 — shared constants. Pure data, no DOM. */
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
    MAX_HEARTS: 5,
    START_HEARTS: 5,
    START_AMMO: 3,
    MAX_AMMO: 12,
    START_BOMBS: 1,
    MAX_BOMBS: 3,
    SHOT_SPEED: 780,
    SHOT_CD: 0.2,
    BOMB_FUSE: 0.28,
    BOMB_R: 700,

    // Power-up mechanics. The internal ids (bike / sword / shield) are gameplay roles; what they look like and
    // what they are called depends on the character (see Q.CHARS below).
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

    // skating on the "tavola d'acqua" (Sensei's ice-rink passages): very little grip
    ICE_ACCEL: 640,
    ICE_FRICTION: 45,

    SCORE: { coin: 10, note: 60, oldman: 300, hall: 300, cat: 200, chip: 150, smash: 15, heart: 100, meteor: 50 },
  };

  /**
   * The playable characters. `feat` switches the encounters / terrain of a run on and off; `power` overrides the label
   * and colour of the power-ups that look different for this character (the mechanics stay the same).
   */
  Q.CHARS = {
    tullio: {
      id: 'tullio',
      name: 'TULLIO',
      aka: 'aka Carlo · aka Maria · aka Capitano',
      locked: false,
      feat: { cat: true, meteor: true, pool: true, ice: false, chips: false, hall: false },
      power: {},
      firstPower: 'pencil',   // the first power-up of every run
      banners: { bike: 'VESPA!', skis: 'SKIS!', sword: 'SWORD!', shield: 'SCUDETTO!', pencil: 'MATITA!' },
      quips: [
        'Va tutto male.', 'Il lemma era banale, in realtà.', 'Figaro ti manda i suoi saluti.', 'Dimostrazione non convergente.',
        'Francone ha mangiato bene.', 'Ricorda: ogni caduta è un controesempio.', 'GAME_21 (Quasi Eri Dentro)',
      ],
      tips: [
        '<b class="c1">Francone</b>, the tall bearded old man, wants to eat you. Grab maths <b>∫ papers</b>, throw them at his face.',
        '<b class="c2">Figaro</b> the cat pounces. Jump on him or paper him.',
        '<b class="c7">RSE meteorite!</b> A rock falls on the red mark: step aside, or lose a heart.',
        '<b class="c3">Vespa · Skis · Sword</b>: speed boosts. The sword kills everything it touches. The <b class="c5">Scudetto</b> blocks everything. The <b class="c7">Pencil</b> pierces every obstacle.',
        '<b class="c4">Bomb</b>: makes everything go wrong. For them.',
        '<b class="c6">Pool ahead?</b> Swimsuit on! Tap jump to paddle.',
      ],
      mobileTip: 'Raccogli monete e potenziamenti. Occhio a Francone e Figaro!',
    },
    sensei: {
      id: 'sensei',
      name: 'SENSEI',
      aka: 'aka Valerix',
      locked: true, // needs one finished run with Tullio
      feat: { cat: false, meteor: false, pool: false, ice: true, chips: true, hall: true },
      chipLine: 'AVETE FATTO DI TESTA VOSTRA', // what he says when he spots Cip e Ciop
      firstPower: 'bike',     // his first power-up is always the passeggino with the little girl...
      firstPowerWeight: 60,   // ...and it comes early (about 13-16 s in), well before the first tavola d'acqua holds power-ups back
      power: {
        bike: { label: 'PASSEGGINO', color: '#ff9ec4' },
        sword: { label: 'BASTONE', color: '#d9a05b' },
        shield: { label: 'FALCE E MARTELLO', color: '#e63946' },
      },
      banners: { bike: 'PASSEGGINO!', skis: 'SKIS!', sword: 'BASTONE!', shield: 'FALCE E MARTELLO!', pencil: 'MATITA!' },
      quips: [
        'Avete fatto di testa vostra.', 'Il maestro è molto deluso.', 'Cip e Ciop ti mandano i loro saluti.', 'Francone ha mangiato bene.',
        'Dimostrazione non convergente.', 'Anche il ghiaccio ha le sue ragioni.', 'GAME_21 (Quasi Eri Dentro)',
      ],
      tips: [
        '<b class="c1">Francone</b>, the tall bearded old man, wants to eat you. Grab maths <b>∫ papers</b>, throw them at his face.',
        '<b class="c2">Cip e Ciop</b>, two chipmunks, pounce one after the other. Jump on them or paper them.',
        '<b class="c8">Mr. Hall</b>, a younger Francone with a red pen, lunges too: throw <b>∫ papers</b> at him (two hits).',
        '<b class="c3">Passeggino · Skis · Bastone</b>: speed boosts. The bastone smashes everything it touches. The <b class="c5">Falce e Martello</b> blocks everything. The <b class="c7">Pencil</b> pierces every obstacle.',
        '<b class="c4">Bomb</b>: makes everything go wrong. For them.',
        '<b class="c6">Tavola d\'acqua ahead?</b> Skates on! You slide like on ice and <b>profili alari</b> (airfoils) block the way: plan your moves early.',
      ],
      mobileTip: 'Raccogli monete e potenziamenti. Occhio a Francone, a Cip e Ciop… e al ghiaccio!',
    },
  };
  Q.CHAR_ORDER = ['tullio', 'sensei'];

  /** Label + colour of a power-up for a given character (falls back to the default one). */
  Q.powerInfo = function (charId, kind) {
    const base = Q.C.POWER[kind] || {};
    const ch = Q.CHARS[charId];
    const over = (ch && ch.power && ch.power[kind]) || {};
    return { label: over.label || base.label, color: over.color || base.color };
  };
})();
