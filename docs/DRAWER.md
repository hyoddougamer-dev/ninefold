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

## 季榜 The Hundred (the competitive season)

**Status:** approved by Bruno on 2026-10-07 as the design for **season 0**; to be adjusted after
the player feedback is dealt with. Not built. The interactive workbook with every open question
(21 of them, each with options and the evidence) is
**https://claude.ai/artifact/Wa1BLrN6FSmjk6FMqgySNq**, and the earlier versions are
v2 (starting realm, rejected) and v3 (**https://claude.ai/artifact/C3bxLCd76Y3shxuexUaRfD**,
the one Bruno liked).

**Why it exists.** Reincarnation, measured, does not shorten a climb: only a multiplier does.
A reset with a bonus is the same game a month later. A season is a *reason to climb again*:
a fresh life for 12 weeks, the same Law for everybody, its own board.

**The idea.**
- A season is 12 weeks. Everyone starts a fresh cultivator under the same Law.
- The top 100 of a season carry a **title and a qi bonus into the next season only**, never
  stacking and never reaching the Eternal (the main save).
- Tiers: Champion (rank 1) +20% qi, Sage (2 to 10) +10%, Laurel (11 to 100) +5%.
  The bolder alternative is +30/+15/+8.
- The bonus is derived on the server from a verified close, never stored in the save.
- A starting realm as the reward was **rejected** by Bruno: it starts a life higher up instead
  of making it faster.

**Why it keeps the economic law.** Capped, one season long, never stacking, and applied on a
fresh life. Nothing uncapped raises the qi rate.

**Measured (harness `play()` with a qi multiplier).** Days to realm 9 / summit: every hour
29 / 36, active 46 / 56, casual 65 / 77, once a day 70 / 84, never fights 121 / 134. A qi bonus
saves about 5% for +5%, 9% for +10%, 16% for +20%, 21% for +30%. So the Champion's +20% is about
8 days for an active player, 42% of the gap between active and casual. Seasons stay an effort
contest: under six example Laws the order of the habits never changed. Only qi Laws move pace
(Thin Qi ×0.85 gives 52/73/79 days; Swift ×1.15 gives 40/56/65). The endgame is a clock of about
5 days per mark whatever the habit, so a season never reaches it.

**Ladder model (1000 players, 8 seasons, 25% churn).** No reward: top 10 repeats 14%, the
champion repeats 0%, top 100 kept 56%, new active in the top 100 28%. With +20/+10/+5: 24%, 9%,
60%, 25%. With +30/+15/+8: 29%, 14%, 61%, 24%. Healthy is a top 10 under 30%.

**What it costs to build.** A second life needs a save slot (client `save.ts` and five call sites
in `App.tsx`; today `saves` is keyed by `user_id` alone). Server: a migration, season standings,
sync reading the slot, `verify` reading the Law, new attacks in `tools/ranked.ts`.

**Open (see the workbook):** how big the blessing is, whether qi is the only reward, the length
of a season, who sets the Law, how a late joiner is treated, and what the main save gets.

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
- **宿慧 The Echo** a life leaves: `ECHO_FIRST` (5%) for its first mark and `ECHO_STEP`
  (2.5%) for every doubling after it, `ECHO_FIRST + ECHO_STEP * log2((1 + marks) / 2)`:
  1 mark +5%, 3 marks +7.5%, 7 +10%, 15 +12.5% (`ECHO_LIFE_MAX`, the most one life gives).
  All lives together: `ECHO_CEILING` = **+25%**. Until 2026-10-08 the first mark was a bare
  step (1 mark +2.5%, 31 marks for the most a life gives); see *The first allowed moment*.
- **Where it applies:** qi gathered, in `advance()` through `gathering()`. `rate()` itself is
  unchanged, so everything paid or priced as seconds of the rate (beds, meetings, the spring,
  incense, melting, drives, retrades) and every lump (the tower, the quarry, the Platform)
  does not move with it. The thunder pool is read off a standard rate, so the Echo fills it
  faster too.
- **What carries:** the Echo, a title per life (再世 Twice-Born, 三世 Thrice-Born, ... 十世),
  the records already on the boards (the server keeps the best ever), who the cultivator is,
  the notices read, the chest's filters, and three forward-only counters (vault runs, the
  last Realm Key day, the week's quarry) so a week cannot pay twice, and **譜 the codex**
  (below). **Everything else begins again.** No heirloom: a ninth-realm piece worn in the first realm either breaks the
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

- **譜 The codex is kept** (Bruno, 2026-10-07: *"o codex não deve reset, seria injusto"*;
  the page promised "finish a set once and it leaves a bonus for good"). `State.codexKept`
  holds, for each of the nine sets, the best rank any life finished it at (0 none, 1 Mystic
  to 3 Heaven). `reincarnate()` writes it from the codex derived at that moment, the higher
  of that life's pieces made and what it already kept, and nothing else writes it. The codex
  reads the higher of the kept rank and this life's own, so finishing a set again only
  matters at a higher rank. The steps for Hundredfold pieces worn (two, four, six, and the
  whole set doubling its bonus) are about pieces worn now, so they begin again with the gear.
  Every bonus keeps its cap (`CODEX_CAP`) and none touches the qi rate. `validate()` holds
  the record to nine ranks of 0 to 3 and empties it for a save with no lives. The server
  strikes a kept codex in a first life, or one that grew without a new life (`'codex'`); one
  that shrank is another copy (`'went-down'`). Across a rebirth, a record holding less than
  the old life had finished is another copy; one holding more (the life forged on after the
  last sync) is taken as born with, bounded by the caps. Shown on 譜 the codex page as earned
  with a quiet "kept from a past life", and in the Rebirth page's "carries" rows.
- **What the kept codex moves** (`npm run rebirth`, section 6: every set at Heaven carried,
  the most a record holds, against none; mean of four gear seeds; days to realm 9 / summit):

| habit | | life 1 | life 2 | life 3 | life 4 | life 5 | life 6 |
| --- | --- | --- | --- | --- | --- | --- | --- |
| active | none | 49.3/57.1 | 45.8/53.6 | 44.8/52.4 | 42.7/49.6 | 42.4/49.3 | 40.6/47.3 |
| active | codex | 49.3/57.1 | 46.2/54.0 | 44.6/52.2 | 42.7/50.1 | 41.9/48.8 | 40.4/46.9 |
| once a day | none | 73.5/88.0 | 72.0/84.3 | 69.0/81.0 | 66.5/79.3 | 65.8/77.5 | 62.5/75.0 |
| once a day | codex | 73.5/88.0 | 71.0/83.0 | 68.3/79.8 | 65.3/77.8 | 63.5/76.3 | 62.3/73.8 |

  The active habit moves by half a day at most, either way: noise. The once-a-day habit is
  1.2 to 1.5 days sooner to the summit in every reborn life and at most 2.3 days sooner to
  realm 9 (life 5): a convenience, not a second Echo. One gear seed alone moves a life by up
  to 5 days either way, because 落星 the bond fills a win sooner and every drop after it is a
  different piece, which is why the table is a mean. Pushed: the set-chaser's own record
  (five sets at Heaven, one at Earth) sits between none and all nine, and all nine with the
  Echo's ceiling a tenth higher walls nothing.

**Measured** (`npm run rebirth`, 2026-10-08, every life ending on its third mark; days to
realm 9 / summit / third mark, and the summit's saving on the first life):

| habit | life 1 | life 2 (+7.5%) | life 3 (+15%) | life 4 (+22.5%) | life 5 (+25%) | life 6 (+25%) |
| --- | --- | --- | --- | --- | --- | --- |
| active | 50/57/69 | 44/52/63 (-9%) | 42/48/59 (-16%) | 41/48/58 (-15%) | 41/48/58 (-15%) | 41/48/58 (-15%) |
| every hour | 32/37/49 | 29/33/43 (-10%) | 29/33/42 (-10%) | 28/32/42 (-13%) | 28/32/42 (-14%) | 28/32/42 (-14%) |
| casual | 66/77/91 | 63/73/87 (-5%) | 59/68/79 (-12%) | 57/66/75 (-14%) | 56/64/75 (-17%) | 56/64/75 (-17%) |
| once a day | 76/90/106 | 71/83/99 (-8%) | 68/79/95 (-12%) | 63/75/90 (-17%) | 61/72/85 (-20%) | 61/72/85 (-20%) |
| never fights | 121/134/155 | 112/124/142 (-7%) | 106/117/135 (-13%) | 99/109/125 (-19%) | 100/110/126 (-18%) | 100/110/126 (-18%) |

- **The first allowed moment** (2026-10-08). The poll and rekaris said a rebirth was not
  worth taking the moment it opens, and measured they were right: at +2.5% the next life
  reached the summit 1% to 10% sooner (casual 1%, active 4%), and nine lives ended on the
  first mark never reached the ceiling. Three candidates were measured, each keeping the
  +25% ceiling: (a) a floor, every ended life leaves at least 5%; (b) a 5% step; (c) 5% for
  the first mark and the same 2.5% step for every doubling after it. All three make a first
  rebirth taken at once leave +5%, and the next life reaches the summit 3% to 9% sooner
  (active 57.2 to 51.8 days, every hour 37.0 to 35.3, casual 77.0 to 74.7, once a day 90.0
  to 83.0, never fights 134 to 122). They differ in the calendar to the ceiling (active
  cultivator, ending every life on mark 1 / 3 / 7): (a) 273 / 316 / 323 days, which makes
  rushing the first Dragon the best road; (b) 273 / 194 / 164 days, the ceiling in two lives
  of seven marks; (c) 273 / 250 / 248 days, every road about the same and further never
  worse. **(c) is built** (`ECHO_FIRST`). Pushed off its number, a first mark worth 5.5%
  moves the next life by 1.4 days at most and walls nothing.
- **To the ceiling:** ending every life on mark 1, life 6 carries +25% after 5 lives (active
  273 days, every hour 184, casual 374, once a day 442, never fights 639). On mark 3, life 5
  after 4 lives (250 / 177 / 332 / 390 / 557). On mark 7, life 4 after 3 lives
  (248 / 193 / 302 / 347 / 511).
- **The honest net:** one rebirth at mark 3 costs the active cultivator 63 days to be back at
  mark 3, which staying would have spent reaching mark 14 (every hour: 43 days, mark 10;
  casual 87, mark 18; once a day 99, mark 19; never fights 142, mark 16). The endgame is a
  clock, so a rebirth always costs marks. What it gives instead is the Echo for every life
  after, a title, the nine realms climbed again with everything the game has grown since,
  and records the boards keep.
- **Knife edge:** the ceiling pushed 10% higher (+27.5%) moves every habit's summit by
  -1.3 to +1.0 days against +25% (active -1.3, casual -0.7, every hour -0.3, once a day +1.0,
  never fights +1.0, the last two being a visit's granularity): smooth, nothing walled.
- **Why 25%:** it is the qi bonus the earlier measurement put at about a fifth off a climb
  (measured here: 14% to 20% at the summit), it is reached only after eight months to a
  year of play, and it is a roof: nothing past it moves the rate, so the law holds.

**Composable with 季榜 The Hundred.** The Echo belongs to the Eternal save. A season is a
fresh life under the season's Law and never reaches the Eternal, so the two never meet. If
Bruno ever wants the Echo inside a season, the two bonuses add and share one ceiling
(`ECHO_CEILING`), never multiply.

**Open for Bruno.** (1) 期榜 the week board counts layers and marks past the account's best,
so a reborn life earns no week credit until it passes its old life; a per-life week board
would need a new column (a migration). (2) The unlock: the first mark, or later. (3) Whether
the title should also show on the boards (it is derived, so the server could read it from
the save without a schema change). (4) An heirloom, if he wants one, needs its own rule.

---

## 丹 Elixirs and sigils at the Dragon (built, switched off at 0, waiting for Bruno)

**Status:** built and measured on 2026-10-08, shipped as `DRAGON_KIT_SHARE = 0` in
`src/sim/balance.ts`, so the game plays exactly as it did. The machinery is all there:
`kitWhere` returns `'dragon'`, `kitFor` thins the kit by the share (`thinKit` in `sim/crafts.ts`),
the server reads the same thing (`bestKit(…, 'dragon')`, `dragonBeaten` in `sim/verify.ts`), and
`tools/endgame.ts` plays the endgame both ways (`playEndgame(…, dragonKit)`, `kitClock`,
`crafterOf`). Setting the constant above zero is the whole switch, and the item text, the carry
card and the Dragon card change with it.

**Why it is off.** rekaris (2026-10-07): *"every tool given to the player should be used in any
place where it makes sense, unless it breaks or trivializes it ... you could make the pills
less effective against the dragon, but still a significant boost to one's fight."* Bruno's
band for it: the full endgame of a crafter with Alchemy and Sigil Writing at 99 shorter by no
more than about 10 to 12 per cent, and a cultivator with no workshop not moved at all. The
Dragon is footed one step above the Dragon the cultivator met at even odds, so a crossing asks
for a few pills of power and a kit is worth those pills at once. Forty crossings of the active
crafter: 231 days with nothing reaching the Dragon; 223 at a share of 0.3% (a strike 0.2%
harder); 218 at 0.5%; 206 at 1.5%; 190 at 2%; 172 at 3%; 153 at 10%; 128 at 30%; 118 at the whole
kit. The once-a-day and every-hour crafters move faster still (14.6% at 0.5%, 17% at 1%). The
only shares inside the band are ones nobody would feel in a fight, and the elixir is spent on
every win. The numbers are on the bible's endgame section and printed by
`src/sim/__tests__/dragonkit.test.ts`.

**What Bruno can choose.** (1) Leave it at 0 and keep the item text honest (it already says the
elixir does not reach the Dragon). (2) Pick a visible share (3% to 10%) and accept a crafter
reaching forty crossings a quarter to a third sooner, as the Sword Saint's 2% already does for
one class. (3) Pick one and raise the Dragon's footing or challenge to pay for it, which moves
every non-crafter as well, so the whole endgame is re-solved (TRIBULATION_GAIN's arithmetic).
The kit must never be read into `evenDragon`: carried in the fight and left out of the
anchor it is a head start, but read into the anchor it becomes a tax on anyone who is out of
stock, and a carry that is taken off between the win and the crossing would be a lever on it.
