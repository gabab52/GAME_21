/*
 * Spawner — endless level generation. Picks weighted "patterns" (small authored combos of
 * obstacles, enemies, platforms and collectibles) and lays them out just off the right edge.
 * Weights depend on elapsed time, difficulty and the player's state (e.g. low on paper → more paper).
 */
(function () {
  const Q = (globalThis.Q = globalThis.Q || {});
  const C = Q.C, U = Q.U;
  const GY = C.GROUND;

  const OBST = {
    cone: { w: 26, h: 32 },
    books: { w: 38, h: 42 },
    buoy: { w: 28, h: 30 },
    wing: { w: 76, h: 28 },  // a drawing of an airfoil (profilo alare): the obstacle of the "tavola d'acqua". The hit box is its thick front part.
  };

  class Spawner {
    constructor(world) {
      this.w = world;
      this.gap = 380;
      this.cool = { enemy: 9, power: 13, bomb: 22, heart: 40, zone: 26, meteor: 30 }; // zone = pool (Tullio) / ice rink (Sensei)
      this.patterns = this.build();
    }

    // ---- placement helpers
    coin(x, y) { this.w.coins.push({ kind: 'coin', x, y, r: 11, value: 1 }); }
    note(x, y) { this.w.coins.push({ kind: 'note', x, y, r: 14, value: 5 }); }
    item(kind, x, y) { this.w.items.push({ kind, x, y, r: kind === 'paper' ? 15 : 20, ph: Math.random() * 6 }); }
    obst(kind, x) { const d = OBST[kind]; this.w.obstacles.push({ kind, x, y: GY, w: d.w, h: d.h }); }
    plat(x, rise, width) { const p = { x, y: GY - rise, w: width }; this.w.platforms.push(p); return p; }
    coinRow(x, y, n, step) { for (let i = 0; i < n; i++) this.coin(x + i * step, y); }
    arc(cx, n, step, base, lift) {
      for (let i = 0; i < n; i++) this.coin(cx + (i - (n - 1) / 2) * step, base - lift * Math.sin((Math.PI * i) / (n - 1)));
    }
    randObst() { return Math.random() < 0.55 ? 'cone' : 'books'; }

    update(dt) {
      const w = this.w;
      for (const k in this.cool) this.cool[k] -= dt;
      this.gap -= w.scroll * dt;
      if (this.gap <= 0) {
        const pat = U.wpick(this.patterns.map((p) => ({ p, w: p.weight(w, this) })));
        const len = pat.p.run(C.W + 50, w, this);
        this.gap = len + w.scroll * U.lerp(0.95, 0.5, w.diff) * U.rand(0.9, 1.25);
      }
    }

    build() {
      const sp = this;
      const noZone = (w) => w.water.length === 0 && w.ice.length === 0;
      // a swim / skate passage is "due" once its cooldown is over: new enemies / power-ups hold off so the field clears for it
      const zoneDue = (w) => (w.feat.pool || w.feat.ice) && w.t > 22 && sp.cool.zone <= 0;
      return [
        // ---- pure collectible patterns
        {
          name: 'coinLine',
          weight: () => 3,
          run(x0) { const n = U.randInt(5, 9); const y = Math.random() < 0.3 ? GY - 80 : GY - 22; sp.coinRow(x0, y, n, 34); return n * 34; },
        },
        {
          name: 'coinWave',
          weight: () => 2,
          run(x0) { const n = 10; for (let i = 0; i < n; i++) sp.coin(x0 + i * 32, GY - 70 + Math.sin(i * 0.9) * 38); return n * 32; },
        },
        {
          name: 'paperRow',
          weight: (w) => (w.ammo < 3 ? 4 : w.ammo < 6 ? 1.6 : 0.5),
          run(x0) { for (let i = 0; i < 3; i++) sp.item('paper', x0 + i * 46, GY - 24); return 140; },
        },
        {
          name: 'jackpot',
          weight: (w) => (w.t > 12 ? 1.2 : 0),
          run(x0) {
            const pw = 230; sp.plat(x0, 140, pw);
            for (let i = 0; i < 5; i++) sp.note(x0 + 30 + i * 42, GY - 140 - 26);
            sp.coinRow(x0 - 120, GY - 60, 3, 36);
            return pw + 60;
          },
        },

        // ---- obstacle patterns
        {
          name: 'arcOverObstacle',
          weight: () => 3,
          run(x0) {
            const k = sp.randObst(); sp.obst(k, x0 + 100);
            sp.arc(x0 + 113, 5, 30, GY - 30, k === 'books' ? 92 : 80);
            return 210;
          },
        },
        {
          name: 'gauntlet',
          weight: (w) => 1.4 + 3 * w.diff - (w.aliveEnemies() ? 0.8 : 0),
          run(x0, w) {
            let x = x0 + 20;
            const groups = 2 + (Math.random() < 0.3 + 0.5 * w.diff ? 1 : 0) + (w.diff > 0.5 && Math.random() < 0.4 ? 1 : 0);
            for (let i = 0; i < groups; i++) {
              if (Math.random() < 0.45) { // tight pair — one jump clears both
                sp.obst('cone', x); sp.obst(Math.random() < 0.5 ? 'cone' : 'books', x + 34);
                if (Math.random() < 0.8) sp.arc(x + 30, 4, 28, GY - 34, 86);
                x += w.scroll * U.rand(0.72, 0.9) + 60;
              } else {
                sp.obst(sp.randObst(), x);
                if (Math.random() < 0.7) sp.arc(x + 13, 3, 28, GY - 34, 76);
                x += w.scroll * U.rand(0.72, 0.9) + 40;
              }
            }
            return x - x0;
          },
        },

        // ---- platforms (Doodle-Jump flavour)
        {
          name: 'platform',
          weight: () => 2.4,
          run(x0) {
            const hi = Math.random() < 0.4; const rise = hi ? 140 : 96; const pw = U.randInt(150, 230);
            sp.plat(x0 + 40, rise, pw);
            const n = Math.floor(pw / 34);
            sp.coinRow(x0 + 40 + (pw - (n - 1) * 34) / 2, GY - rise - 24, n, 34);
            if (Math.random() < 0.35) sp.obst(sp.randObst(), x0 + 40 + pw / 2 - 20);
            if (sp.w.ammo < 4 && Math.random() < 0.6) sp.item('paper', x0 + 40 + pw / 2, GY - rise - 50);
            return pw + 110;
          },
        },
        {
          name: 'stairs',
          weight: (w) => (w.t > 8 ? 1.6 : 0),
          run(x0, w) {
            const up = Math.random() < 0.5; const pw = 130; const hop = w.scroll * 0.3 + 20;
            let x = x0 + 30;
            const rises = up ? [80, 125, 165] : [165, 125, 80];
            rises.forEach((r) => {
              sp.plat(x, r, pw);
              sp.coinRow(x + 22, GY - r - 24, 3, 36);
              x += pw + hop;
            });
            return x - x0;
          },
        },

        // ---- swimming passage: the ground turns into water, the hero swaps to swimwear and paddles
        {
          name: 'water',
          weight: (w) => (w.feat.pool && zoneDue(w) && noZone(w) && !w.power.type && !w.enemies.some((e) => !e.dead) && !w.player.dead ? 30 : 0),
          run(x0, w) {
            const s = w.scroll;
            const len = Math.round(s * U.rand(5.5, 7));
            const zx = x0 + 60;
            w.water.push({ x: zx, w: len });
            // entry grace, then a rhythm of buoys with stroke-arcs of coins over them
            let x = zx + s * 0.9;
            while (x < zx + len - s * 0.7) {
              const roll = Math.random();
              if (roll < 0.55) {
                sp.obst('buoy', x);
                sp.arc(x + 14, 5, 30, GY - 34, 84);
                x += s * U.rand(0.85, 1.1) + 60;
              } else if (roll < 0.8) {
                sp.coinRow(x, GY - 80 - Math.random() * 20, 6, 32);
                x += 6 * 32 + s * 0.35;
              } else {
                for (let i = 0; i < 3; i++) sp.note(x + i * 46, GY - 40 - Math.sin(i * 1.6) * 30);
                x += s * 0.8;
              }
            }
            sp.cool.zone = U.rand(34, 50);
            // keep Francone and Figaro away until the pool is behind us
            sp.cool.enemy = Math.max(sp.cool.enemy, (len + 500) / s);
            return len + 140;
          },
        },

        // ---- "tavola d'acqua" (Sensei): the road becomes an ice rink; he skates and slides instead of swimming
        {
          name: 'rink',
          weight: (w) => (w.feat.ice && zoneDue(w) && noZone(w) && !w.enemies.some((e) => !e.dead) && !w.player.dead ? 30 : 0),
          run(x0, w) {
            const s = w.scroll;
            const len = Math.round(s * U.rand(6, 8));     // a little longer than the pool: you need room to slide
            const zx = x0 + 60;
            w.ice.push({ x: zx, w: len });
            // entry grace, then airfoil profiles with arcs of coins over them, coin rows to glide through, banknote trails
            let x = zx + s * 1.1;
            while (x < zx + len - s * 0.8) {
              const roll = Math.random();
              if (roll < 0.55) {
                sp.obst('wing', x);   // only airfoil profiles on the rink (no cones)
                sp.arc(x + 36, 5, 30, GY - 34, 88);
                x += s * U.rand(0.9, 1.15) + 120;
              } else if (roll < 0.8) {
                sp.coinRow(x, GY - 26, 7, 32);
                x += 7 * 32 + s * 0.3;
              } else {
                for (let i = 0; i < 3; i++) sp.note(x + i * 46, GY - 40 - Math.sin(i * 1.6) * 30);
                x += s * 0.8;
              }
            }
            sp.cool.zone = U.rand(34, 50);
            sp.cool.enemy = Math.max(sp.cool.enemy, (len + 500) / s);   // Francone and the chipmunks wait until the rink is behind us
            return len + 140;
          },
        },

        // ---- enemy encounters
        {
          name: 'chips',
          // Cip e Ciop come as a pair, one behind the other. They replace Figaro in the Sensei's runs.
          weight: (w) => (w.feat.chips && w.t > 10 && noZone(w) && !zoneDue(w) && sp.cool.enemy <= 0 && w.aliveEnemies('chip') === 0 ? 2.2 + 2 * w.diff : 0),
          run(x0, w) {
            w.spawnChips();
            sp.cool.enemy = U.rand(5, 8) * (1 - 0.4 * w.diff) + 1.5;
            return 300;
          },
        },
        {
          name: 'figaro',
          weight: (w) => (w.feat.cat && w.t > 10 && noZone(w) && !zoneDue(w) && sp.cool.enemy <= 0 && w.aliveEnemies('cat') < 1 + (w.diff > 0.6 ? 1 : 0) ? 2.2 + 2 * w.diff : 0),
          run(x0, w) {
            w.spawnCat();
            sp.cool.enemy = U.rand(5, 8) * (1 - 0.4 * w.diff);
            if (w.diff > 0.4 && Math.random() < 0.5) { const e = w.spawnCat(); e.x += 260; }
            return 260;
          },
        },
        {
          name: 'oldMan',
          weight: (w) => (w.t > 22 && noZone(w) && !zoneDue(w) && sp.cool.enemy <= 0 && w.aliveEnemies('oldman') < 1 && w.aliveEnemies('hall') < 1 ? 1.8 + 1.5 * w.diff : 0),
          run(x0, w) {
            // make sure the player can actually fight: drop paper sheets right before him
            const n = w.ammo < 4 ? 5 : w.ammo < 8 ? 3 : 0;
            for (let i = 0; i < n; i++) sp.item('paper', x0 + i * 44, GY - 24);
            w.spawnOldMan();
            sp.cool.enemy = U.rand(9, 14) * (1 - 0.4 * w.diff);
            return Math.max(240, n * 44 + 100);
          },
        },

        {
          // Mr. Hall: the Sensei's villain, a younger Francone. Never together with Francone (one boss at a time).
          name: 'hall',
          weight: (w) => (w.feat.hall && w.t > 26 && noZone(w) && !zoneDue(w) && sp.cool.enemy <= 0 && w.aliveEnemies('hall') < 1 && w.aliveEnemies('oldman') < 1 ? 1.8 + 1.5 * w.diff : 0),
          run(x0, w) {
            // make sure the player can fight: drop paper sheets right before him
            const n = w.ammo < 4 ? 5 : w.ammo < 8 ? 3 : 0;
            for (let i = 0; i < n; i++) sp.item('paper', x0 + i * 44, GY - 24);
            w.spawnHall();
            sp.cool.enemy = U.rand(9, 14) * (1 - 0.4 * w.diff);
            return Math.max(240, n * 44 + 100);
          },
        },

        // ---- RSE meteorite: a rock with "RSE" on it comes down on the hero's position; dodge it sideways
        {
          name: 'meteor',
          // (not held back by a pending swim passage: a meteor is a quick event and never overlaps the pool itself)
          weight: (w) => (w.feat.meteor && w.t > 28 && noZone(w) && sp.cool.meteor <= 0 && w.meteors.length === 0 && !w.player.dead
            && !w.enemies.some((e) => !e.dead && (e.state === 'windup' || e.state === 'lunge')) ? 2.6 + 2 * w.diff : 0),
          run(x0, w) {
            w.spawnMeteor();
            sp.cool.meteor = U.rand(13, 20) * (1 - 0.35 * w.diff);
            return 140;
          },
        },

        // ---- power-ups and consumables
        {
          name: 'powerUp',
          weight: (w) => (!w.power.type && noZone(w) && !zoneDue(w) && sp.cool.power <= 0 && w.t > 10 ? (sp.firstPowerDone ? 2.2 : w.char.firstPowerWeight || 2.2) : 0),
          run(x0, w) {
            // the very first power-up of a run is the character's signature one (Tullio: the pencil, Sensei: the passeggino), so it
            // never goes unnoticed; after that it's a weighted draw
            const kind = !sp.firstPowerDone ? (w.char.firstPower || 'pencil')
              : U.wpick([{ w: 0.28, k: 'bike' }, { w: 0.22, k: 'skis' }, { w: 0.16, k: 'sword' }, { w: 0.15, k: 'shield' }, { w: 0.35, k: 'pencil' }]).k;
            sp.firstPowerDone = true;
            const pw = 170; sp.plat(x0 + 70, 96, pw);
            sp.item(kind, x0 + 70 + pw / 2, GY - 96 - 34);
            sp.arc(x0 + 20, 4, 30, GY - 40, 50);
            sp.cool.power = U.rand(20, 30);
            return pw + 130;
          },
        },
        {
          name: 'bombCrate',
          weight: (w) => (w.t > 8 && w.bombs < C.MAX_BOMBS && sp.cool.bomb <= 0 ? 1.4 : 0),
          run(x0) { sp.coinRow(x0, GY - 22, 3, 34); sp.item('bomb', x0 + 150, GY - 26); sp.cool.bomb = U.rand(18, 28); return 220; },
        },
        {
          name: 'heart',
          weight: (w) => (w.hearts < C.MAX_HEARTS && sp.cool.heart <= 0 && w.t > 12 ? 2.2 : 0),
          run(x0) { sp.arc(x0 + 40, 3, 34, GY - 30, 30); sp.item('heart', x0 + 140, GY - 90); sp.cool.heart = U.rand(20, 32); return 220; },
        },
      ];
    }
  }

  Q.Spawner = Spawner;
})();
