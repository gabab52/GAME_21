# GAME_21

An endless side-scrolling arcade game (Doodle Jump platforms × Chrome-Dino running) with **two playable characters**.
**Run it:** double-click `index.html`. No build step, no server, no dependencies (Google Fonts are optional; it falls back to system fonts offline).
Keep `logo.png` next to `index.html`: it is the title screen (and the browser-tab icon). Without it the title falls back to plain text.

## Flow
**Title screen** (the logo — Enter / Space / click / tap) → **character select** (← → / A D or the arrow buttons, then Play) → run → game over → menu.
- **Tullio** (aka Carlo, aka Maria, aka Capitano) is the default character.
- **Sensei** is locked ("NON SEI ANCORA DEGNO", shown as a black silhouette) until you have finished one run with Tullio (game over reached). The unlock is saved in the browser; so are the best scores, one per character (`localStorage` keys `game21.best.<id>` and `game21.unlocked.sensei`).

## Controls
| Key | Action |
|---|---|
| ← → / A D | move (in the menu: previous / next character) |
| Space / ↑ / W | jump (press again in the air for a double jump; release early for a short hop) |
| ↓ / S | drop through a platform |
| X | throw a paper demonstration |
| Z | bomb — **VA TUTTO MALE** |
| P / Esc | pause · M mute · R restart (when paused / game over) · Enter start/restart |

Touch devices get on-screen buttons automatically: **tap anywhere on the screen to jump** (hold for a higher hop, tap again in the air for the double jump / a swim stroke), while the left thumb has the arrows plus the paper and bomb buttons. Several fingers work at once. In the character select, tap the arrows (or the portrait) to scroll.

## What's in it (both characters)
- **Francone** (tall, lanky old man with a long white beard and black glasses) stalks the right edge, telegraphs ("!" and red eyes behind the lenses), then lunges with open jaws. When he first walks in he announces himself with a shouted **"SIGNORI"**. 2 paper hits to beat him (two lives); the first makes him yell **"CAZZO RIDI"**, the second **"LE DERIVATE"** (speech bubble, plus the browser's Italian voice if available), and it ends in `GAME_21 ∎`. Stand your ground, throw from the floor, jump the lunge.
- Cones and book stacks as obstacles (no flying enemies).
- **Rome skyline** in the background: Colosseo, Altare della Patria, Colonna Traiana, Pantheon, Castel Sant'Angelo + Ponte, San Pietro, with rooftops and umbrella pines; it cycles day → sunset → night → dawn.
- **Papers ∫** = ammo (max 12). **Bomb** (max 3) wipes everything nearby with a slow-mo "VA TUTTO MALE" blast (plus an Italian voice line if the browser has one).
- **Skis** ×1.4, slidey, lost if you get hit · **Matita** (pencil, 8 s) ×1.2: a pencil sticks out of the hero's hips and pierces every obstacle without a scratch (it writes **SPUNTITO!** each time) and impales Figaro / the chipmunks on its tip before they can pounce (**BESTIACCIA!**, they're carried on the pencil for a moment and then flung away); Francone and meteorites still hurt. The first power-up of every run is always the character's signature one: the Matita for Tullio, the Passeggino for the Sensei (set by `firstPower` in `Q.CHARS`). Each power-up is temporary, with a HUD timer; one at a time.
- **Money**: coins (€1) and banknotes (€5). You start with **5 hearts** (max 5); hearts restore health and show up fairly often.
- Speed and enemy frequency ramp up over time; the sky cycles day → sunset → night → dawn.

## Tullio's run
- **Figaro**, the tuxedo cat, sprints in, crouches and pounces (twice). Stomp him or paper him (2 hits).
- **RSE meteorite**: from ~30 s a flaming rock with "RSE" on it falls from the sky onto the spot where you stand (a red target shows on the road). Step aside or lose a heart. The sword slices it, the Vespa and the Scudetto shrug it off, the bomb blows it up; the Pencil does *not* help.
- **Swimming passages**: every ~40 s the road turns into a pool. Touch down in it and a puff of smoke swaps the hero into swim trunks and goggles; every jump press is a paddle stroke (spam them to go higher). Buoys are the obstacles, coins and banknotes float in arcs. Another puff changes him back when he climbs out. Vespa and skis are lost when you dive in; no enemies spawn during a swim.
- Power-ups: **Vespa** ×1.65 speed, immune, smashes obstacles · **Sword** (rare) ×1.3, kills anything it touches · **Scudetto** (giallorosso shield, 10 s) ×1.12, nothing you run into can hurt you.

## Sensei's run
Same rules, different cast and terrain (all switched by `Q.CHARS.sensei.feat` in `config.js`):
- **No Figaro, no meteorite, no pool.**
- **Cip e Ciop**, two chipmunks, replace Figaro: they arrive one behind the other, crouch and pounce. One paper or one stomp is enough for each. When the Sensei first sees them he says **"AVETE FATTO DI TESTA VOSTRA"** (speech bubble + Italian voice).
- **Tavola d'acqua** replaces the swimming passages: the road turns into an ice rink (signpost at the entrance). A puff of smoke puts skates on him and he **slides like on ice** — slow to accelerate, almost no braking — so you have to plan your moves early. The obstacles are drawings of an airfoil (**profili alari**: grey section, chord line, dash-dot camber line, dimension arrows), with coins and banknotes in rows and arcs. They are the *only* obstacles on the rink (no cones). The skates come off at the end of the rink. No enemies spawn on it.
- **Bastone** (knotted wooden staff) replaces the sword: it hits and destroys every obstacle in front of him (and anything else it touches).
- **Passeggino** replaces the Vespa: he pushes a stroller with a little girl in it (she waves, her pigtails fly; the name **Cecilia** pops up when he takes it and floats over her for the first seconds). Same ×1.65 speed, immune, smashes obstacles. It is the first power-up of every Sensei run.
- **Falce e martello** replaces the Scudetto: same 10 s of "nothing can hurt you", a red-and-gold aura with little emblems orbiting it.
- **Francone** stays, and he has company: **Mr. Hall**, a younger Francone (dark swept-back hair, no beard, navy suit and red tie, a big red pen). Same stalk / wind-up / lunge, but a little quicker. **Throw papers at him to annihilate him**: two hits, the first makes him shout **"Modifica painful"**, the second (killing) one **"as is"** (speech bubble plus an English voice line if the browser has one). A name tag and a banner announce him; he never appears together with Francone, and papers are dropped on the road before his entrance. Not in Tullio's runs.

## Code layout (`js/`)
Gameplay is separate from rendering: `world.js` / `spawner.js` / `bot.js` have **no** DOM or canvas access and report what happened through `world.events`.

| File | Role |
|---|---|
| `config.js`, `util.js` | constants, helpers; `Q.CHARS` = the playable characters (feature switches, power-up names, quips, menu tips) |
| `world.js` | all rules: physics, enemies, power-ups, collisions, bomb, swimming and ice-skating |
| `spawner.js` | endless level generation from weighted, difficulty-aware patterns (gated by the character's features) |
| `bot.js` | autoplayer (menu attract mode + tests) |
| `art.js` | every sprite of Tullio's world, drawn procedurally with canvas paths |
| `art_sensei.js` | the Sensei, passeggino + girl, bastone, falce e martello, profilo alare, Cip e Ciop, Mr. Hall, and their power-up badges |
| `renderer.js`, `fx.js` | background/entity drawing (incl. the ice rink), particles, screen shake, VA TUTTO MALE overlay |
| `audio.js` | all sound + music synthesised with WebAudio |
| `input.js` | keyboard + touch |
| `main.js` | state machine (title → menu → playing ⇄ paused → over), character select, unlock/best-score storage, HUD, events → fx/sfx |

## Dev pages (`dev/`)
Open directly in a browser, or run headless: `msedge --headless=new --dump-dom dev/rules.html`
- `rules.html` — 79 rule tests (jump, damage, each weapon, each power-up, Francone's lines, meteorite, swimming, platforms… and for the Sensei: feature switches, no Figaro/meteorite/pool, Cip e Ciop, Mr. Hall, the ice rink, bastone / passeggino / falce e martello)
- `test.html` — 12 bot-played games with Tullio + 6 with the Sensei, plus invariants
- `ui.html` — drives the real page (needs `--allow-file-access-from-files`): title screen, character select, locked Sensei, unlock after a finished run, HUD labels, long render soaks
- `sheet.html` / `sheet_sensei.html` — sprite sheets of every character/pose/item
- `new.html`, `head.html` — close-ups of Francone, the hero's head, the RSE meteorite

Debug URL flags for `index.html`: `?autoplay`, `?start` (skip the menus), `?menu` (skip the title screen), `&sel=sensei` (highlight him on the menu), `&char=sensei` (play him, unlocked for this visit only), `&unlock`, `&touch` / `&notouch` (force the phone / desktop layout), `&ff=40` (fast-forward seconds), `&give=bike|skis|sword|shield|pencil`, `&swim`, `&ice`, `&oldman`, `&hall`, `&hit`, `&cat`, `&chips`, `&meteor`, `&bomb`.
