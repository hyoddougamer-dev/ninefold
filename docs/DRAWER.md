# 屜 The drawer: ideas kept for an expansion

Things that were designed, shown to Bruno, and deliberately **not** built yet. Each one is
written down so a later expansion can start from the thinking rather than from nothing.
Nothing here is in the game, and nothing in the game depends on any of it.

The mockups for the three spirit-beast proposals are a standalone page:
**https://claude.ai/artifact/TY3uB1Twbc2B5j46wDd6P8**

---

## 收服 The warden who stayed (spirit-beast proposal A)

**Status:** shelved on 2026-09-27 for a good expansion. Bruno liked the idea and did not see
a good way to make it look right yet: *"não me parece existir uma boa forma estética de
aplicar a A, no entanto, trabalhamos isto posteriormente para uma outra expansão."*

**Why a companion was taken out first.** The first 靈獸 was a percentage bolted onto the
hunt and a beast floating beside her in the arena: one more number in a fight, not a
system. Bruno did not like it and it was reverted (commit `c607a7e`). Whatever comes back
has to be its own screen with its own loop.

**The idea.** Beating a realm's warden offers a choice: 收 subdue it, or 放 let it go. A
subdued warden becomes your 護法 guardian. It never fights beside you. It keeps one part of
your world while you are away, and it cultivates too: after weeks on duty it takes human
form (化形), as in the stories.

- One guardian on duty at a time; the others wait in the courtyard and keep their form.
- Three forms: 醒 awake on subduing, 化形 human form at 14 days on duty, 聖 sacred at 42,
  counted off the save's own clock like the cave beds.
- Each of the nine keeps a different system, three duties each (one per form), all capped:

  | Warden | Keeps |
  | --- | --- |
  | 妖狐 Spirit Fox | fortune: a better piece once a day, fate bars fill sooner |
  | 石猿 Stone Ape | the hunt: hunts a named beast while you sleep, counted in the record |
  | 仙鶴 Immortal Crane | the road: people come sooner and remember more |
  | 雷虎 Thunder Tiger | the tower |
  | 玄武 Black Turtle | the cave |
  | 石傀 Stone Puppet | the forge |
  | 魔狼 Demon Wolf | the vault |
  | 蛟 Serpent Dragon | seclusion |
  | 龍 Dragon | the furnace |

**Rules it has to keep.** It never touches fight odds and never raises the qi rate (the
economic law). Changing guardian takes nothing away. Every duty is finite and measured by
the harnesses before it ships.

**What is missing, and why it is shelved.** The art. The warden paintings exist in one
form each; the idea needs 化形 and 聖 for all nine, which is 18 new paintings in two sheets
of nine, and a way to show a beast "on duty" in the house that reads as a place rather than
a card. Until that has a look Bruno believes in, it waits here.

---

## 靈獸園 The spirit garden (spirit-beast proposal B)

The 100th win over a common beast (通) leaves its egg. It hatches in a nest (12 h), grows
from cub to grown to spirit beast over days, and grown beasts go on 4 to 12 hour errands to
their own realm, returning with that realm's material and a piece from the beast's own
`leaves` list. 27 eggs, one per common: an album to finish. No new paintings needed (stage
shown by size and tint). Weak point: raising a 屍蟲 Corpse Worm as a pet is odd. It sits
well on top of A later, to give the 27 commons a use.

## 鬥獸 Beast duels (spirit-beast proposal C)

Seal commons with talismans, field a team of three, and let it fight other players' saved
teams in a weekly league on the ranked server, with the five phases (五行) as the
rock-paper-scissors. The most different and the most expensive: a new team combat, a new
server league and new anti-cheat. Risk: it splits the game in two.

---

## 轉世 Rebirth (built, on its own branch, waiting for Bruno)

**Status:** built and measured on 2026-10-07, not released. Unlike everything else in this
drawer it is in the code: `src/sim/rebirth.ts`, `src/sim/echo.ts`, `src/app/ui/Rebirth.tsx`,
measured by `npm run rebirth` (tools/rebirth.ts). It is written down here because its numbers
are a decision, and a decision has to live somewhere other than a conversation.

**Bruno's brief.** *"From a certain realm onward you can reset, but the benefit of the reset
depends on how far ahead you are."* Testers past the Dragon report nothing left but a clock of
about five days a mark. One asked for an uncapped multiplier per reset (2x, 4x, 8x qi,
stacking); measured, a stacked 2x cuts the climb to the summit by 45% and 8x by 82%, which is
the economic law broken outright. The earlier abstract models (a Wheel, head-start realms)
were rejected and are not revived.

**As built.**
- **Unlock:** the summit (the ninth realm's last rung) with the first Dragon crossed
  (`REBIRTH_MARKS = 1`). Measured, that is 3 to 10 days after the summit for every habit.
- **Depth** of a life: the 雷印 marks it crossed, and nothing else. The heaven is derived from
  the marks; the tower is left out on purpose, because a floor is checked against the body
  that won it and once a life ends that body is gone.
- **宿慧 The Echo** a life leaves: `ECHO_STEP` (2.5%) for every doubling of its marks,
  `log2(1 + marks)`: 1 mark +2.5%, 3 marks +5%, 7 +7.5%, 15 +10%, 31 +12.5%
  (`ECHO_LIFE_MAX`, the most one life gives). All lives together: `ECHO_CEILING` = **+25%**.
- **Where it applies:** qi gathered, in `advance()` through `gathering()`. `rate()` itself is
  unchanged, so everything paid or priced as seconds of the rate (beds, meetings, the spring,
  incense, melting, drives, retrades) and every lump (the tower, the quarry, the Platform)
  does not move with it. The thunder pool is read off a standard rate, so the Echo fills it
  faster too.
- **What carries:** the Echo, a title per life (再世 Twice-Born, 三世 Thrice-Born, ... 十世),
  the records already on the boards (the server keeps the best ever), who the cultivator is,
  the notices read, the chest's filters, and three forward-only counters (vault runs, the
  last Realm Key day, the week's quarry) so a week cannot pay twice. **Everything else
  begins again.** No heirloom: a ninth-realm piece worn in the first realm either breaks the
  server's gear check (a strike) or needs a new rescaling rule, and one more uncapped power
  path is the opposite of what the endgame needs.
- **Record:** `State.lives`, at most `LIVES_MAX` = 9 entries of `{ marks, at }` (seconds),
  validated by `validLives`: whole marks from 1 to 300, instants in order inside the save's
  life. The Echo, the title and the day a life began are derived from it, never stored.
- **Server:** `verify()` reads a pair across a rebirth as the claimed marks paid out of the
  time first (a mark is at least the pool at the deepest sitting and the larger Echo), then
  the new life verified from `bornFrom`, the same function the game is reborn through. A
  forged record can claim at most +25% of rate and waits for the marks it claims; two copies
  reborn differently are another copy, never a strike. The sync core, the spare copy and the
  cloud pick order saves by lives first (`progressOf`). **No Supabase schema change.**

**Measured** (`npm run rebirth`, every life ending on its third mark; days to realm 9 /
summit / third mark, and the summit's saving on the first life):

| habit | life 1 | life 2 (+5%) | life 3 (+10%) | life 4 (+15%) | life 5 (+20%) | life 6 (+25%) |
| --- | --- | --- | --- | --- | --- | --- |
| active | 46/56/68 | 41/51/63 (-9%) | 42/51/62 (-8%) | 40/49/59 (-12%) | 39/47/57 (-15%) | 38/45/56 (-18%) |
| every hour | 29/35/47 | 28/34/45 (-4%) | 27/32/43 (-8%) | 26/31/41 (-12%) | 26/31/42 (-12%) | 25/30/39 (-16%) |
| casual | 65/77/90 | 61/73/85 (-6%) | 59/70/82 (-9%) | 57/69/79 (-11%) | 55/67/77 (-13%) | 53/63/73 (-18%) |
| once a day | 70/84/101 | 69/83/102 (-1%) | 65/80/95 (-5%) | 65/77/92 (-8%) | 62/75/89 (-11%) | 59/72/86 (-14%) |
| never fights | 121/134/155 | 108/122/140 (-9%) | 103/116/134 (-13%) | 106/117/135 (-13%) | 100/111/128 (-17%) | 100/110/126 (-18%) |

- **To the ceiling:** ending every life on mark 3, life 6 carries +25% after 5 lives
  (active 308 days, every hour 219, casual 413, once a day 479, never fights 692). On mark 7,
  life 5 after 4 lives (312 / 252 / 395 / 447 / 668). On mark 1, **never**: nine lives give
  +22.5%, so rushing the first Dragon over and over is not the road to it.
- **The honest net:** one rebirth at mark 3 costs the active cultivator 63 days to be back at
  mark 3, which staying would have spent reaching mark 14 (every hour: 45 days, mark 10;
  casual 85, mark 17; once a day 102, mark 21; never fights 140, mark 15). The endgame is a
  clock, so a rebirth always costs marks. What it gives instead is the Echo for every life
  after, a title, the nine realms climbed again with everything the game has grown since,
  and records the boards keep.
- **Knife edge:** the ceiling pushed 10% higher (+27.5%) moves every habit's summit by
  -2.3 to +1.0 days against +25% (casual -2.3, once a day -1.0, every hour -0.7, active +0.3,
  never fights +1.0, the last two being a visit's granularity): smooth, nothing walled.
- **Why 25%:** it is the qi bonus the earlier measurement put at about a fifth off a climb
  (measured here: 14% to 18% at the summit), it is reached only after about a year of
  play, and it is a roof: nothing past it moves the rate, so the law holds.

**Composable with 季榜 The Hundred.** The Echo belongs to the Eternal save. A season is a
fresh life under the season's Law and never reaches the Eternal, so the two never meet. If
Bruno ever wants the Echo inside a season, the two bonuses add and share one ceiling
(`ECHO_CEILING`), never multiply.

**Open for Bruno.** (1) 期榜 the week board counts layers and marks past the account's best,
so a reborn life earns no week credit until it passes its old life; a per-life week board
would need a new column (a migration). (2) The unlock: the first mark, or later. (3) Whether
the title should also show on the boards (it is derived, so the server could read it from
the save without a schema change). (4) An heirloom, if he wants one, needs its own rule.
