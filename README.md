# QED RUN

An endless side-scrolling arcade game (Doodle Jump platforms × Chrome-Dino running).
**Run it:** double-click `index.html`. No build step, no server, no dependencies (Google Fonts are optional; it falls back to system fonts offline).

## Controls
| Key | Action |
|---|---|
| ← → / A D | move |
| Space / ↑ / W | jump (press again in the air for a double jump; release early for a short hop) |
| ↓ / S | drop through a platform |
| X | throw a paper demonstration |
| Z | bomb — **VA TUTTO MALE** |
| P / Esc | pause · M mute · R restart (when paused / game over) · Enter start/restart |

Touch devices get on-screen buttons automatically: **tap anywhere on the screen to jump** (hold for a higher hop, tap again in the air for the double jump / a swim stroke), while the left thumb has the arrows plus the paper and bomb buttons. Several fingers work at once.

## What's in it
- **Hero** drawn from `main_character.jpg` (black pillbox cap with white band, wavy hair, stubble, grey tee) and, on the Vespa, from `main_char_on_bike.jpg` (grey helmet, grey shirt, navy trousers, brown shoes, black backpack, white scooter).
- **Francone** (tall, lanky old man with a long white beard and black glasses) stalks the right edge, telegraphs ("!" and red eyes behind the lenses), then lunges with open jaws. When he first walks in he announces himself with a shouted **"SIGNORI"**. 2 paper hits to beat him (two lives); the first makes him yell **"CAZZO RIDI"**, the second **"LE DERIVATE"** (speech bubble, plus the browser's Italian voice if available), and it ends in `Q.E.D. ∎`. Stand your ground, throw from the floor, jump the lunge.
- **Figaro**, the tuxedo cat, sprints in, crouches and pounces (twice). Stomp him or paper him (2 hits).
- **RSE meteorite**: from ~30 s a flaming rock with "RSE" on it falls from the sky onto the spot where you stand (a red target shows on the road). Step aside or lose a heart. The sword slices it, the Vespa and the Scudetto shrug it off, the bomb blows it up; the Pencil does *not* help.
- Cones and book stacks as obstacles (no flying enemies).
- **Rome skyline** in the background: Colosseo, Altare della Patria, Colonna Traiana, Pantheon, Castel Sant'Angelo + Ponte, San Pietro, with rooftops and umbrella pines; it cycles day → sunset → night → dawn.
- **Swimming passages**: every ~40 s the road turns into a pool. Touch down in it and a puff of smoke swaps the hero into swim trunks and goggles; every jump press is a paddle stroke (spam them to go higher). Buoys are the obstacles, coins and banknotes float in arcs. Another puff changes him back when he climbs out. Vespa and skis are lost when you dive in; no enemies spawn during a swim.
- **Papers ∫** = ammo (max 12). **Bomb** (max 3) wipes everything nearby with a slow-mo "VA TUTTO MALE" blast (plus an Italian voice line if the browser has one).
- **Power-ups** (one at a time): **Vespa** ×1.65 speed, immune, smashes obstacles · **Skis** ×1.4, slidey, lost if you get hit · **Sword** (rare) ×1.3, kills anything it touches · **Scudetto** (giallorosso shield, 10 s) ×1.12, nothing you run into can hurt you: obstacles shatter, enemies bounce off · **Matita** (pencil, 8 s) ×1.2: a pencil sticks out of the hero's hips and pierces every obstacle (cones, books, buoys) without a scratch (it writes **SPUNTITO!** each time) and impales Figaro on its tip before he can pounce (**BESTIACCIA!**, he's carried on the pencil for a moment and then flung away); Francone and meteorites still hurt, and it's lost when you dive into a pool. Each is temporary, with a HUD timer. The first power-up of every run is always the Matita.
- **Money**: coins (€1) and banknotes (€5). You start with **5 hearts** (max 5); hearts restore health and show up fairly often.
- Speed and enemy frequency ramp up over time; the sky cycles day → sunset → night → dawn.

## Code layout (`js/`)
Gameplay is separate from rendering: `world.js` / `spawner.js` / `bot.js` have **no** DOM or canvas access and report what happened through `world.events`.

| File | Role |
|---|---|
| `config.js`, `util.js` | constants, helpers |
| `world.js` | all rules: physics, enemies, power-ups, collisions, bomb |
| `spawner.js` | endless level generation from weighted, difficulty-aware patterns |
| `bot.js` | autoplayer (menu attract mode + tests) |
| `art.js` | every sprite, drawn procedurally with canvas paths |
| `renderer.js`, `fx.js` | background/entity drawing, particles, screen shake, VA TUTTO MALE overlay |
| `audio.js` | all sound + music synthesised with WebAudio |
| `input.js` | keyboard + touch |
| `main.js` | state machine (menu → playing ⇄ paused → over), HUD, events → fx/sfx |

## Dev pages (`dev/`)
Open directly in a browser, or run headless: `msedge --headless=new --dump-dom dev/rules.html`
- `rules.html` — 51 rule tests (jump, damage, each weapon, each power-up incl. scudetto and pencil, Francone's lines, meteorite aim/dodge/immunities, swimming & costume change, water spawning, platforms staying put under the hero…)
- `test.html` — 12 bot-played games + invariants
- `ui.html` — drives the real page (needs `--allow-file-access-from-files`)
- `sheet.html` — sprite sheet of every character/pose/item
- `new.html` — close-ups of Francone (all states), the hero with the pencil, the RSE meteorite

Debug URL flags for `index.html`: `?autoplay`, `&ff=40` (fast-forward seconds), `&give=bike|skis|sword|shield|pencil`, `&swim`, `&oldman`, `&hit`, `&cat`, `&meteor`, `&bomb`.
