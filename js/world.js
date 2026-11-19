/*
 * World — all gameplay rules. No DOM, no canvas. It consumes an input snapshot each tick and
 * reports what happened through `events` (sounds / particles / UI are driven from those).
 *
 * Coordinates: screen space, y grows downward. Scrolling things (coins, items, obstacles,
 * platforms) move left at `scroll` px/s. Player and enemies carry their own screen velocity.
 * Entities anchored at bottom-centre (x, y = feet) unless noted (coins/items use centre).
 */
(function () {
  const Q = (globalThis.Q = globalThis.Q || {});
  const C = Q.C, U = Q.U;
  const G = C.GRAVITY;

  // Francone's two catchphrases, one per life: "CAZZO RIDI" on the first hit, "LE DERIVATE" on the second (the killing one)
  const OLDMAN_LINES = ['CAZZO RIDI', 'LE DERIVATE'];

  class World {
    constructor() { this.reset(); }

    reset() {
      this.t = 0;
      this.diff = 0;
      this.distance = 0;
      this.meters = 0;
      this.scroll = C.BASE_SPEED;
      this.speedMul = 1;
      this.score = 0;
      this.bonus = 0;
      this.money = 0;
      this.kills = 0;
      this.hearts = C.START_HEARTS;
      this.ammo = C.START_AMMO;
      this.bombs = C.START_BOMBS;
      this.power = { type: null, t: 0, dur: 0 };
      this.coins = [];
      this.items = [];
      this.obstacles = [];
      this.platforms = [];
      this.water = [];     // water passages {x, w}: inside them the hero swims instead of running
      this.enemies = [];
      this.meteors = [];   // RSE meteorites falling from the sky (screen space, they don't scroll)
      this.shots = [];
      this.events = [];
      this.shieldCd = 0;
      this.over = false;
      this.bombFuse = 0;   // >0 while the bomb is armed
      this.bombFx = 0;     // >0 after the blast (renderer shows VA TUTTO MALE)
      this.shotCd = 0;
      this.player = {
        x: 170, y: C.GROUND, vx: 0, vy: 0, w: 30, h: 62,
        prevY: C.GROUND, onGround: true, plat: null, jumps: 0, coyote: 0, jumpBuf: 0, canCut: false,
        dropT: 0, invuln: 0, hurtT: 0, throwT: 0, collectT: 0, bombT: 0, swingT: 0,
        dead: false, deadT: 0, animT: 0, gameOverSent: false,
        swim: false, strokeCd: 0, changeT: 0,
      };
      this.spawner = new Q.Spawner(this);
    }

    emit(type, data) {
      const e = data || {};
      e.type = type;
      this.events.push(e);
    }

    // ---------------------------------------------------------------- main tick
    update(dt, inp) {
      const p = this.player;
      this.t += dt;
      this.diff = Math.min(1, this.t / 110);

      const base = C.BASE_SPEED + (C.MAX_SPEED - C.BASE_SPEED) * (1 - Math.exp(-this.t / C.RAMP));
      const pm = this.power.type ? C.POWER[this.power.type].mul : 1;
      const target = p.dead ? 0 : pm;
      this.speedMul += (target - this.speedMul) * Math.min(1, dt * (p.dead ? 2.2 : 3));
      this.scroll = base * this.speedMul;
      const ds = this.scroll * dt;
      this.distance += ds;
      this.meters = this.distance / C.PX_PER_M;
      this.score = Math.floor(this.meters) + this.bonus;

      // power-up timer
      if (this.power.type && !p.dead) {
        this.power.t -= dt;
        if (this.power.t <= 0) this.endPower();
      }
      // hitbox: wide for the Vespa, low and long when swimming
      p.w = this.power.type === 'bike' ? 62 : p.swim ? 44 : 30;
      p.h = p.swim ? 26 : 62;
      this.shieldCd -= dt;

      // scrolling entities
      for (const arr of [this.coins, this.items, this.obstacles, this.platforms, this.water]) {
        for (const e of arr) e.x -= ds;
      }
      this.water = this.water.filter((z) => z.x + z.w > -80);
      this.coins = this.coins.filter((e) => e.x > -60);
      this.items = this.items.filter((e) => e.x > -60);
      this.obstacles = this.obstacles.filter((e) => e.x + e.w > -60 && !e.gone);
      this.platforms = this.platforms.filter((e) => e.x + e.w > -60);

      if (!p.dead) this.spawner.update(dt);

      this.shotCd -= dt;
      if (this.bombFx > 0) this.bombFx -= dt;
      if (this.bombFuse > 0) {
        this.bombFuse -= dt;
        if (this.bombFuse <= 0) this.blast();
      }

      this.updatePlayer(dt, inp, ds);
      this.updateEnemies(dt, ds);
      this.updateShots(dt);
      this.updateMeteors(dt);
      if (!p.dead) this.collide(dt);
    }

    // ---------------------------------------------------------------- player
    box() {
      const p = this.player;
      return U.rect(p.x, p.y, p.w, p.h);
    }

    updatePlayer(dt, inp, ds) {
      const p = this.player;
      p.animT += dt;

      if (p.dead) {
        p.deadT += dt;
        p.vy = Math.min(C.MAX_FALL, p.vy + G * dt);
        p.y += p.vy * dt;
        p.x += p.vx * dt;
        if (p.y >= C.GROUND) { p.y = C.GROUND; p.vy = 0; p.vx *= 0.8; }
        if (!p.gameOverSent && p.deadT > 1.3) {
          p.gameOverSent = true;
          this.over = true;
          this.emit('gameover');
        }
        return;
      }

      p.invuln -= dt; p.hurtT -= dt; p.throwT -= dt; p.collectT -= dt; p.bombT -= dt; p.dropT -= dt; p.swingT += dt;
      p.strokeCd -= dt; p.changeT -= dt;
      p.prevY = p.y;

      // run <-> swim: the costume changes when he touches down in the water / climbs out of it
      const inZone = this.inWater(p.x);
      if (inZone && !p.swim && p.onGround && p.y >= C.GROUND - 1) this.setSwim(true);
      else if (!inZone && p.swim) this.setSwim(false);

      const skis = this.power.type === 'skis';
      const dir = (inp.right ? 1 : 0) - (inp.left ? 1 : 0);
      const max = C.MOVE * (skis ? 1.12 : 1);
      if (p.hurtT > 0) {
        p.vx *= Math.max(0, 1 - 5 * dt);
      } else {
        const accel = skis ? 750 : 3400;
        const fric = skis ? 380 : 3400;
        if (dir) p.vx += dir * accel * dt;
        else if (p.vx > 0) p.vx = Math.max(0, p.vx - fric * dt);
        else if (p.vx < 0) p.vx = Math.min(0, p.vx + fric * dt);
        p.vx = U.clamp(p.vx, -max, max);
      }
      p.x += p.vx * dt;
      // NB: no "platform carries you back with the scroll": the hero runs at the world's pace on a platform exactly as on the
      // ground, so his screen position stays put and the coins slide towards him — he never gets pinned at the left edge.
      p.x = U.clamp(p.x, C.X_MIN, C.X_MAX);

      // jump (coyote time + input buffer + one air jump)
      p.coyote = p.onGround ? C.COYOTE : p.coyote - dt;
      p.jumpBuf = inp.jumpPressed ? C.JUMP_BUF : p.jumpBuf - dt;
      if (p.swim) {
        // swimming: every press is a stroke that pushes you up through the water; unlimited, slightly floaty
        if (p.hurtT <= 0 && p.jumpBuf > 0 && p.strokeCd <= 0) {
          p.vy = -C.SWIM_STROKE; p.strokeCd = C.SWIM_COOLDOWN; p.jumpBuf = 0; p.onGround = false; p.canCut = false;
          this.emit('stroke', { x: p.x, y: p.y });
        }
      } else if (p.hurtT <= 0 && p.jumpBuf > 0) {
        if (p.coyote > 0) {
          p.vy = -C.JUMP_V; p.jumps = 1; p.coyote = 0; p.jumpBuf = 0; p.canCut = true; p.onGround = false; p.plat = null;
          this.emit('jump', { x: p.x, y: p.y });
        } else if (p.jumps < 2) {
          p.vy = -C.AIR_JUMP_V; p.jumps = 2; p.jumpBuf = 0; p.canCut = false;
          this.emit('djump', { x: p.x, y: p.y });
        }
      }
      if (inp.down && p.onGround && p.plat) { p.dropT = 0.22; p.onGround = false; p.plat = null; }
      if (!inp.jumpHeld && p.canCut && p.vy < -C.CUT_V) { p.vy = -C.CUT_V; p.canCut = false; }

      // vertical integration + landing
      const wasGround = p.onGround;
      const prevFeet = p.y;
      p.vy = Math.min(p.swim ? C.SWIM_MAX_FALL : C.MAX_FALL, p.vy + (p.swim ? C.SWIM_G : G) * dt);
      p.y += p.vy * dt;
      p.onGround = false; p.plat = null;
      if (p.vy >= 0) {
        if (p.dropT <= 0) {
          for (const pl of this.platforms) {
            if (prevFeet <= pl.y + 4 && p.y >= pl.y && p.x + p.w / 2 > pl.x && p.x - p.w / 2 < pl.x + pl.w) {
              p.y = pl.y; p.plat = pl; p.onGround = true;
            }
          }
        }
        if (!p.onGround && p.y >= C.GROUND) { p.y = C.GROUND; p.onGround = true; }
        if (p.onGround) {
          if (!wasGround && p.vy > 250) this.emit(p.swim ? 'splash' : 'land', { x: p.x, y: p.y });
          p.vy = 0; p.jumps = 0; p.canCut = false;
        }
      }

      // throw / bomb
      if (inp.throwPressed && p.hurtT <= 0) {
        if (this.ammo > 0 && this.shotCd <= 0) {
          this.ammo--; this.shotCd = C.SHOT_CD; p.throwT = 0.26;
          const sy = p.y - (p.swim ? 20 : 40);
          this.shots.push({ x: p.x + 16, y: sy, vx: C.SHOT_SPEED, rot: 0 });
          this.emit('throw', { x: p.x + 16, y: sy });
        } else if (this.ammo <= 0) {
          this.emit('empty');
        }
      }
      if (inp.bombPressed && this.bombs > 0 && this.bombFuse <= 0 && this.bombFx <= 0) {
        this.bombs--; this.bombFuse = C.BOMB_FUSE; p.bombT = 1.0;
        this.emit('bomb_arm', { x: p.x, y: p.y - 30 });
      }
    }

    // ---------------------------------------------------------------- water / swimming
    inWater(x) {
      for (const z of this.water) if (x > z.x && x < z.x + z.w) return true;
      return false;
    }
    setSwim(on) {
      const p = this.player;
      p.swim = on; p.changeT = 0.4; p.jumps = 0; p.canCut = false;
      if (on) {
        p.vy *= 0.3;
        // wheels, skis and a pencil don't work in the pool
        if (this.power.type === 'bike' || this.power.type === 'skis' || this.power.type === 'pencil') this.endPower(true);
        this.emit('splash', { x: p.x, y: p.y });
      }
      this.emit('costume', { swim: on, x: p.x, y: p.y - 30 });
    }

    // ---------------------------------------------------------------- enemies
    spawnOldMan() {
      const e = {
        kind: 'oldman', x: C.W + 90, y: C.GROUND, vx: 0, vy: 0, w: 36, h: 96, hp: 2, maxHp: 2,   // tall and lanky, but only two lives: one line per hit
        state: 'enter', st: 0, life: 0, anchor: C.W - 150, flash: 0, iframes: 0, dead: false, deadT: 0,
        rot: 0, spin: 0, next: U.rand(1.2, 2.0), lungeSpeed: 480 + this.diff * 160, quote: null, quoteT: 0, hits: 0,
      };
      this.enemies.push(e);
      this.emit('enemy_spawn', { kind: 'oldman', x: C.W - 60, y: C.GROUND - 40 });
      return e;
    }
    spawnCat() {
      const e = {
        kind: 'cat', x: C.W + 60, y: C.GROUND, vx: 0, vy: 0, w: 40, h: 26, hp: 2, maxHp: 2,
        state: 'run', st: 0, leaps: 0, flash: 0, iframes: 0, dead: false, deadT: 0, rot: 0, spin: 0, nameT: 2.4,
        run: 100 + this.diff * 110,
      };
      this.enemies.push(e);
      this.emit('enemy_spawn', { kind: 'cat', x: C.W - 60, y: C.GROUND - 30 });
      return e;
    }
    enemyBox(e) {
      if (e.kind === 'oldman') return U.rect(e.x, e.y, e.w - (e.state === 'lunge' ? 0 : 6), e.h);
      return U.rect(e.x, e.y, e.w, e.h);
    }
    aliveEnemies(kind) {
      let n = 0;
      for (const e of this.enemies) if (!e.dead && e.state !== 'leave' && (!kind || e.kind === kind)) n++;
      return n;
    }

    updateEnemies(dt, ds) {
      const p = this.player;
      for (const e of this.enemies) {
        e.flash -= dt; e.iframes -= dt; e.st += dt;
        if (e.dead) {
          e.deadT += dt;
          if (e.skewer) {
            // impaled on the pencil: carried on its tip for a moment, wiggling, then flung away
            if (e.deadT < 0.5) { e.x = p.x + 50; e.y = p.y - 3; e.rot = -0.25 + Math.sin(e.deadT * 45) * 0.1; continue; }
            e.skewer = false; e.vx = 320; e.vy = -540; e.spin = -12;
            this.emit('unskewer', { x: e.x, y: e.y - 14 });
          }
          e.vy += G * dt * (e.kind === 'oldman' ? 0.8 : 1);
          e.x += e.vx * dt; e.y += e.vy * dt; e.rot += e.spin * dt;
          if (e.kind !== 'oldman' && e.y > C.GROUND && e.vy > 0) { e.y = C.GROUND; e.vy *= -0.3; e.vx *= 0.6; e.spin *= 0.5; }
          continue;
        }
        if (e.kind === 'oldman') this.tickOldMan(e, dt);
        else this.tickCat(e, dt, ds);
      }
      this.enemies = this.enemies.filter((e) => e.x > -160 && e.x < C.W + 300 && e.deadT < 1.6 && e.y < C.H + 200 && !e.gone);
    }

    tickOldMan(e, dt) {
      const p = this.player;
      e.life += dt;
      if (e.quoteT > 0) e.quoteT -= dt;
      switch (e.state) {
        case 'enter':
          e.x -= 300 * dt;
          if (e.x <= e.anchor) {
            this.setState(e, 'stalk', U.rand(1.0, 1.9) * (1.15 - this.diff * 0.45));
            if (!e.greeted) { // first entrance: he announces himself
              e.greeted = true;
              this.emit('speech', { text: 'SIGNORI', x: e.x, y: e.y - 150, who: 'oldman', shout: true });
            }
          }
          break;
        case 'stalk':
          e.x += (e.anchor + Math.sin(e.life * 2.2) * 34 - e.x) * Math.min(1, dt * 7);
          if (e.life > 22) { this.setState(e, 'leave'); this.emit('oldman_leave', { x: e.x, y: e.y - 60 }); }
          else if (e.st > e.next) { this.setState(e, 'windup'); this.emit('warn', { x: e.x, y: e.y - 70 }); }
          break;
        case 'windup':
          if (e.st > 0.72) { this.setState(e, 'lunge'); this.emit('chomp', { x: e.x, y: e.y - 20 }); }
          break;
        case 'lunge':
          e.x -= e.lungeSpeed * dt;
          if (e.x < -70) { // he runs off the left edge and shuffles back in from the right — one pass per lunge
            e.x = C.W + 90; this.setState(e, 'enter');
          }
          break;
        case 'stun':
          e.x += e.vx * dt; e.vx *= Math.max(0, 1 - 4 * dt);
          if (e.st > 0.55) this.setState(e, 'stalk', 0.9);
          break;
        case 'leave':
          e.x += 320 * dt;
          break;
      }
    }
    setState(e, s, next) { e.state = s; e.st = 0; if (next != null) e.next = next; }

    tickCat(e, dt, ds) {
      const p = this.player;
      if (e.nameT > 0) e.nameT -= dt;
      switch (e.state) {
        case 'run': {
          e.x -= (this.scroll + e.run) * dt;
          const dx = e.x - p.x;
          if (dx < 290 && dx > 60 && e.leaps < 2 && e.st > 0.35) { this.setState(e, 'crouch'); this.emit('meow', { x: e.x, y: e.y - 30 }); }
          break;
        }
        case 'crouch':
          e.x -= this.scroll * dt;
          if (e.st > 0.4) {
            e.vy = -600; e.vx = -(this.scroll + 230 + this.diff * 90);
            this.setState(e, 'leap');
          }
          break;
        case 'leap':
          e.vy += G * dt; e.y += e.vy * dt; e.x += e.vx * dt;
          if (e.y >= C.GROUND) { e.y = C.GROUND; e.vy = 0; e.leaps++; this.setState(e, 'run'); }
          break;
      }
    }

    damageEnemy(e, dmg, src) {
      if (e.dead || e.iframes > 0) return false;
      e.hp -= dmg;
      e.flash = 0.22;
      e.iframes = src === 'paper' ? 0.04 : 0.45;
      if (e.hp <= 0) { this.killEnemy(e, src); return true; }
      e.hits = (e.hits || 0) + 1;
      this.emit('enemy_hit', { kind: e.kind, x: e.x, y: e.y - e.h / 2, src });
      if (e.kind === 'oldman') {
        this.setState(e, 'stun');
        e.vx = src === 'bike' ? 380 : 120;
        e.quote = OLDMAN_LINES[(e.hits - 1) % OLDMAN_LINES.length]; e.quoteT = 1.3;
        this.emit('speech', { text: e.quote, x: e.x, y: e.y - 150, who: 'oldman', shout: true });
      } else if (e.kind === 'cat') {
        this.emit('hiss', { x: e.x, y: e.y - 20 });
      }
      return true;
    }

    killEnemy(e, src) {
      e.dead = true; e.deadT = 0; e.hp = 0;
      this.kills++;
      const pts = C.SCORE[e.kind];
      this.bonus += pts;
      if (e.kind === 'oldman') {
        e.vy = -640; e.vx = 380; e.spin = 9; e.state = 'dead';
        // the last word is his too (a paper's killing blow keeps the alternation going)
        e.quote = OLDMAN_LINES[(e.hits || 0) % OLDMAN_LINES.length];
        this.emit('speech', { text: e.quote, x: e.x, y: e.y - 150, who: 'oldman', shout: true });
      } else if (src === 'pencil') { e.vy = 0; e.vx = 0; e.spin = 0; e.state = 'dead'; e.skewer = true; }
      else { e.vy = -520; e.vx = 220; e.spin = -12; e.state = 'dead'; }
      this.emit('kill', { kind: e.kind, x: e.x, y: e.y - e.h / 2, pts, src });
    }

    // ---------------------------------------------------------------- shots
    updateShots(dt) {
      for (const s of this.shots) { s.x += s.vx * dt; s.rot += 14 * dt; }
      const sb = (s) => U.crect(s.x, s.y, 22, 22);
      for (const s of this.shots) {
        for (const e of this.enemies) {
          if (e.dead || s.gone) continue;
          if (U.overlap(sb(s), this.enemyBox(e))) {
            s.gone = true;
            this.emit('paper_hit', { x: s.x, y: s.y, kind: e.kind });
            this.damageEnemy(e, 1, 'paper');
          }
        }
      }
      this.shots = this.shots.filter((s) => !s.gone && s.x < C.W + 40);
    }

    // ---------------------------------------------------------------- RSE meteorite
    /** A meteorite aimed at the hero's position (+ a little lead). It falls diagonally; the target is shown on the ground. */
    spawnMeteor(tx) {
      const p = this.player, R = C.METEOR.R;
      const x = U.clamp(tx != null ? tx : p.x + p.vx * 0.3, C.X_MIN + 20, C.X_MAX + 20);
      const T = 1.35 - 0.3 * this.diff;                       // flight time: shorter (harder) later in the run
      const x0 = x + U.rand(170, 260), y0 = -80;
      const m = {
        x: x0, y: y0, vx: (x - x0) / T, vy: (C.GROUND - R - y0) / T, r: R, tx: x, T, t: 0,
        state: 'fall', boomT: 0, harm: false, by: C.GROUND - 16, rot: 0, spin: U.rand(-2.5, 2.5), gone: false,
      };
      this.meteors.push(m);
      this.emit('meteor_warn', { x, y: C.GROUND });
      return m;
    }
    updateMeteors(dt) {
      for (const m of this.meteors) {
        if (m.state === 'fall') {
          m.t += dt; m.x += m.vx * dt; m.y += m.vy * dt; m.rot += m.spin * dt;
          if (m.y >= C.GROUND - m.r) { m.y = C.GROUND - m.r; this.explodeMeteor(m, true); }
        } else m.boomT += dt;
      }
      this.meteors = this.meteors.filter((m) => !m.gone && m.boomT < 0.55);
    }
    /** ground = true: it reached the road, the fireball hurts for a few frames. Otherwise it just burst on the hero. */
    explodeMeteor(m, ground) {
      m.state = 'boom'; m.boomT = 0; m.harm = ground; m.by = ground ? C.GROUND - 16 : m.y;
      this.emit('meteor_impact', { x: m.x, y: m.by, ground });
    }
    smashMeteor(m) { // destroyed by sword / Vespa / scudetto: no blast, bonus points
      m.gone = true; this.bonus += C.SCORE.meteor;
      this.emit('meteor_smash', { x: m.x, y: m.y });
    }

    // ---------------------------------------------------------------- collisions
    collide(dt) {
      const p = this.player;
      const pb = this.box();
      const sword = this.power.type === 'sword';
      const bike = this.power.type === 'bike';
      const shield = this.power.type === 'shield';
      const pencil = this.power.type === 'pencil';
      const swordBox = sword ? { l: p.x + 4, r: p.x + 96, t: p.y - 84, b: p.y + 4 } : null;
      // the pencil sticks out of the hips, a bit in front of the body
      const pencilBox = pencil ? { l: p.x + 8, r: p.x + 60, t: p.y - 30, b: p.y - 8 } : null;

      // coins & banknotes
      for (const c of this.coins) {
        if (c.gone) continue;
        if (U.overlap(pb, U.crect(c.x, c.y, c.r * 2 + 8, c.r * 2 + 8))) {
          c.gone = true;
          this.money += c.value;
          this.bonus += c.kind === 'note' ? C.SCORE.note : C.SCORE.coin;
          p.collectT = 0.35;
          this.emit(c.kind === 'note' ? 'note' : 'coin', { x: c.x, y: c.y, value: c.value });
        }
      }
      this.coins = this.coins.filter((c) => !c.gone);

      // pick-ups
      for (const it of this.items) {
        if (it.gone) continue;
        if (U.overlap(pb, U.crect(it.x, it.y, it.r * 2, it.r * 2))) {
          it.gone = true;
          p.collectT = 0.5;
          this.pickup(it);
        }
      }
      this.items = this.items.filter((i) => !i.gone);

      // obstacles
      for (const o of this.obstacles) {
        const ob = U.shrink(U.rect(o.x + o.w / 2, o.y, o.w, o.h), 3);
        const pierced = pencil && (U.overlap(pencilBox, ob) || U.overlap(pb, ob));
        if (swordBox && U.overlap(swordBox, ob) || ((bike || shield) && U.overlap(pb, ob)) || pierced) {
          o.gone = true;
          this.bonus += C.SCORE.smash;
          this.emit('smash', { x: o.x + o.w / 2, y: o.y - o.h / 2, kind: o.kind, src: pierced ? 'pencil' : undefined });
          if (shield) this.shieldFlash(o.x + o.w / 2, o.y - o.h / 2);
        } else if (p.invuln <= 0 && U.overlap(pb, ob)) {
          this.hurt(o.x + o.w / 2);
        }
      }

      // meteorites: the falling rock hurts, so does the fireball on the road. Sword / Vespa / scudetto shrug it off.
      for (const m of this.meteors) {
        if (m.gone) continue;
        const falling = m.state === 'fall';
        if (!falling && !(m.harm && m.boomT < C.METEOR.BLAST_T)) continue;
        const cx = m.x, cy = falling ? m.y : m.by, R = falling ? m.r - 4 : C.METEOR.BLAST;
        const near = (b) => { const nx = U.clamp(cx, b.l, b.r), ny = U.clamp(cy, b.t, b.b); return (cx - nx) * (cx - nx) + (cy - ny) * (cy - ny) < R * R; };
        const hitBody = near(pb);
        if ((falling && swordBox && near(swordBox)) || (hitBody && (bike || shield))) {
          if (falling) { this.smashMeteor(m); if (shield) this.shieldFlash(m.x, m.y); }
          else if (shield) this.shieldFlash(cx, cy);
        } else if (hitBody && p.invuln <= 0) {
          this.hurt(m.x);
          if (falling) this.explodeMeteor(m, false);
        }
      }
      this.meteors = this.meteors.filter((m) => !m.gone);

      // enemies
      for (const e of this.enemies) {
        if (e.dead) continue;
        const eb = this.enemyBox(e);
        if (swordBox && (U.overlap(swordBox, eb) || U.overlap(pb, eb))) { this.killEnemy(e, 'sword'); continue; }
        // the pencil skewers Figaro before he reaches the hero ("BESTIACCIA!"); Francone is too big for it
        if (pencilBox && e.kind === 'cat' && (U.overlap(pencilBox, eb) || U.overlap(pb, eb))) { this.killEnemy(e, 'pencil'); continue; }
        if (!U.overlap(pb, eb)) continue;
        if (bike) {
          this.damageEnemy(e, e.kind === 'oldman' ? 1 : 99, 'bike');
          continue;
        }
        const stompable = e.kind !== 'oldman';
        if (stompable && p.vy > 60 && p.prevY <= eb.t + 14) {
          p.vy = -560; p.jumps = 1; p.canCut = false;
          this.emit('stomp', { x: e.x, y: e.y - e.h });
          this.killEnemy(e, 'stomp');
        } else if (shield) {
          this.shieldFlash(e.x, e.y - e.h / 2); // the scudetto simply shrugs it off
        } else if (p.invuln <= 0) {
          this.hurt(e.x);
          if (e.kind === 'oldman') this.emit('chomp', { x: e.x, y: e.y - 30 });
        }
      }
    }

    pickup(it) {
      const p = this.player;
      switch (it.kind) {
        case 'paper':
          this.ammo = Math.min(C.MAX_AMMO, this.ammo + 1);
          this.emit('paper_pick', { x: it.x, y: it.y });
          break;
        case 'bomb':
          if (this.bombs < C.MAX_BOMBS) this.bombs++; else this.bonus += 50;
          this.emit('bomb_pick', { x: it.x, y: it.y });
          break;
        case 'heart':
          if (this.hearts < C.MAX_HEARTS) this.hearts++; else this.bonus += C.SCORE.heart;
          this.emit('heart_pick', { x: it.x, y: it.y });
          break;
        default:
          this.startPower(it.kind);
          this.emit('power_pick', { kind: it.kind, x: it.x, y: it.y });
      }
    }

    startPower(type) {
      const old = this.power.type;
      if (old && old !== type) this.emit('power_end', { kind: old, silent: true });
      this.power = { type, t: C.POWER[type].dur, dur: C.POWER[type].dur };
      this.emit('power_start', { kind: type });
    }
    endPower(noGrace) {
      const old = this.power.type;
      this.power = { type: null, t: 0, dur: 0 };
      if (!noGrace) this.player.invuln = Math.max(this.player.invuln, 1.0);
      this.emit('power_end', { kind: old });
    }
    shieldFlash(x, y) {
      if (this.shieldCd > 0) return;
      this.shieldCd = 0.25;
      this.emit('shield_block', { x, y });
    }

    hurt(srcX) {
      const p = this.player;
      if (p.invuln > 0 || p.dead || this.power.type === 'shield') return;
      this.hearts--;
      if (this.power.type === 'skis') this.endPower();
      if (this.hearts <= 0) {
        p.dead = true; p.deadT = 0; p.vy = -640; p.vx = -140;
        this.power = { type: null, t: 0, dur: 0 };
        this.emit('hurt', { x: p.x, y: p.y - 30, fatal: true });
        this.emit('die', { x: p.x, y: p.y - 30 });
        return;
      }
      p.invuln = 1.7; p.hurtT = 0.45;
      p.vy = -430; p.vx = srcX >= p.x ? -230 : 230; p.onGround = false; p.plat = null; p.canCut = false;
      this.emit('hurt', { x: p.x, y: p.y - 30, fatal: false });
    }

    // ---------------------------------------------------------------- bomb
    blast() {
      const p = this.player;
      this.bombFx = 2.0;
      this.emit('bomb_blast', { x: p.x, y: p.y - 30 });
      for (const e of this.enemies) {
        if (e.dead) continue;
        if (Math.hypot(e.x - p.x, e.y - e.h / 2 - (p.y - 30)) < C.BOMB_R) this.killEnemy(e, 'bomb');
      }
      for (const o of this.obstacles) {
        if (Math.hypot(o.x - p.x, o.y - p.y) < C.BOMB_R) {
          o.gone = true; this.bonus += C.SCORE.smash;
          this.emit('smash', { x: o.x + o.w / 2, y: o.y - o.h / 2, kind: o.kind });
        }
      }
      for (const m of this.meteors) if (!m.gone && m.state === 'fall') this.smashMeteor(m); // everything goes wrong, for them
    }
  }

  Q.World = World;
})();
