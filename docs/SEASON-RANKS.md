> Proposal, not decided (15 Oct 2026). Shown to Bruno at https://claude.ai/artifact/NhxFhDeKauAfBJ7QjEnRyu with the Discord validation.

# 榜 Season rankings and levels: the recommendation, checked (15 Oct 2026)

This is `SEASON-RANKS.md` after an adversarial check against the code on the working branch
(`claude/idle-fantasy-mobile-game-nzn90r`) and on `origin/main`. It is a design only: the
repository was not changed, nothing was committed and nothing was published.

What the check read: `supabase/functions/sync/core.ts` (how a run, a life and a week are decided),
`src/sim/verify.ts` (`firstSync`, the `reborn` path, `livesExtend`), `src/sim/echo.ts`
(`progressOf`, `echoFactor`), `src/sim/balance.ts` (`ECHO_ROOF` 0.35), `src/sim/season.ts`
(`SEASON`, `KNOWN`), the `in_season()` and `my_standing()` SQL on the branch, the player copy in
`src/app/copy.ts`, the measurement in `ranks/chap112.json`, and `RANKS-NOW.md`.

Section 0 lists every defect found and its fix. Sections 1 to 12 are the recommendation with the
fixes applied. Changed text is marked **[fixed D#]**.

## Resumo (para o 師 Shibaki)

- **A recomendação mantém-se:** níveis permanentes na seita, e um quadro de caminho andado nas
  seasons seguintes. A verificação encontrou 20 defeitos; 4 eram graves e estão corrigidos aqui.
- **Os graves:**
  - **Fazer batota no quadro do caminho com dois saves.** Duas runs alternadas, cada uma a passar a
    outra por uma camada, recebiam a montanha inteira em cada troca. Agora uma run nova só conta o
    que passa do último save verificado (D1).
  - **Os títulos de fecho da Season 0 aceitavam progresso feito depois do fecho**, durante os três
    dias de tolerância. Agora o servidor fotografa cada conta no momento do fecho (D2).
  - **Mudar o `in_season()` para a Season 1 escondia do Heaven quem estivesse ausente.** Isso é
    tirar a quem está fora. O `in_season()` fica para sempre ligado à Season 0, e as seasons
    seguintes usam a sua própria conta (D3).
  - **O renascimento em série ganha o 期 This Week já na Season 0** (a partir da semana 6), não só
    na Season 1. A decisão 6 tem de ser tomada antes do R2 (D4).
- **Nomes que mudam:**
  - "The Road 程" colide com 緣 the road (os encontros) que o jogo já tem, e passa a **The Journey 程**.
  - "Standing" colide com "standing qi rate", e passa a **sect rank 位**.
  - **Deacon 執事** passa a **Guardian 護法**: Deacon é palavra de igreja, e 執事 é um cargo de
    secretaria, abaixo de um 真傳弟子.
  - **Great Elder 大長老** passa a **Peak Lord 峰主**: 大長老 é *o* ancião-chefe, um só, e o selo 大
    confunde-se com 太 num quadrado pequeno.
  - **門階** passa a **位階**.
- **Com poucos jogadores, "top 100" é toda a gente.** Os títulos de fecho passam a ter bandas
  proporcionais ao número de contas (D5).
- **O título da Torre fica só para a Season 0.** A Torre é um recorde de sempre, por isso nas
  seasons seguintes daria o título aos mesmos dez para sempre (D6).
- **Decisões tuas:** secção 9, com três novas (nomes, bandas, Torre).

---

## 0. Defects found, and the fix for each

Ordered by severity. "Rule" names the hard rule or attack question each defect touches.

### Serious

**D1. The Journey can be farmed with two runs (rule: can a rank be faked).**
The proposal credits "a new life" with `lifeRoad(after)` in full. In `core.ts` the only existing
notion of a new life is the Samsara one, `sameLife = !!old && !newRun && livesNow === old.lives`,
which counts a **new run** (another `startedAt`) as a new life. A new run is verified whenever it
is ahead of the last verified save (`ahead(after) > ahead(prev)`, measured by `firstSync` from its
own start), and `NEW_RUN_LEAP` only holds it for review when it leaps more than 9 layers. Two
runs played in turn on two devices (or one device with save export and import, since offline time
advances both) that each pass the other by one layer would be credited the whole mountain at every
swap, unflagged.
*Fix:* a **new life** is only verify's own rebirth path: the same `startedAt`, and
`livesExtend(prev.lives, after.lives)` with more lives. A **new run** is credited
`max(0, lifeRoad(after) − lifeRoad(prev))`, exactly as This Week already gives a new run no leap
credit. A test plays two leapfrogging runs and asserts the total equals the furthest walk once.

**D2. Season 0's close counts progress made after the close (rule: fair close).**
The close runs lazily three days after the boundary, and reads the Heaven List and the Tower as
they stand then. Both are account bests that every verified sync during those three days keeps
raising, so marks and floors won on Monday to Wednesday of Season 1 decide the Founding's titles.
The grace also does not do what it says: the game always re-sends its newest save, never the
`waiting` one, so a waiting save is not "verified later"; its progress arrives inside a newer save.
*Fix:* at each account's first verified sync after the boundary, the server writes
`season_snap(season, user_id, climb, marks, climbed_at, tower, tower_at, walked)` **before** applying
the sync, with the gain since the last verified save split by time at the boundary (the
`weekStart` arithmetic, rounded down for climb, marks and floor). `close_season()` ranks from
`season_snap` where a row exists and from `standings` where it does not (nobody synced since).
The three-day grace stays, so that a player who last synced on Friday and opens the game on
Tuesday still has the pre-boundary share counted.

**D3. Moving `in_season()` to a later season would hide the absent (rule: nothing taken for being away).**
Every board, `title_of`, `my_standing`, `stats` and the panel filter on `in_season(updated_at)`,
which is anchored to `season_start()`. If Season 1 moved that anchor, every account that had not
synced since Season 1's first second would vanish from Heaven, the Tower and Samsara until it
synced. The season door in `core.ts` would also refuse every save, since saves keep
`season: 's0'` for ever (D1 of the drawer: the last wipe) and `KNOWN = ['s0']`.
*Fix:* `in_season()`, `season_start()`, `SEASON` and the season door stay tied to the Founding for
good. Later seasons are **chapters** with their own `chapter_of(t)` in `src/sim/road.ts` and SQL,
read only by the Journey, its close and the Roll. A schema test asserts that `season_start()` never
changes and that a Season 0 save syncs after a chapter boundary.

**D4. Serial rebirth wins This Week in Season 0, not only in Season 1 (rule: decision order).**
The proposal says decision 6 (rebirth on the Road) "must be settled before Season 1". But R2 puts
This Week on li in season week 3 and gives a reborn life week credit from its first layer. The
first rebirths come around day 37 to 40 (week 6), and the drawer's table puts a reborn every-hour
life at about 112 li a week against 58 for staying at the summit. From week 6 the weekly titles
期首 and 期十 would go to whoever reborns most often. The `(1 − echo)` damping does not cover it:
the Echo is only 5% to 12.5% after one or two lives, while a reborn life climbs about twice the
reference pace because the early ruler is cheap.
*Fix:* decision 6 moves to **before R2**. Until it is made, R2 ships with the cautious default:
a reborn life's li are credited at no more than 1.5 times the reference pace (15 li a day since its
rebirth), and the rest waits and is credited later at that pace. Nothing is ever removed, so this
takes nothing away. Measure it with `tools/rebirth.ts` before R2.

### Real but smaller

**D5. With today's population, "top 100" is everybody (rule: titles mean something; late joiner).**
The polls in the digest draw 1 or 2 votes, and on 15 Oct about ten default-named accounts were
enough to change the look of the Heaven List. With 20 to 40 ranked accounts, "Hundred of the
Founding" goes to every player who ever synced and "Ten of the Founding" to a third of them.
*Fix:* bands follow the number of ranked accounts on that board at the close, N:
First is rank 1; Top Ten is ranks 2 to `min(10, max(2, ⌈N/10⌉))`; Top Hundred is the ranks after
that up to `min(100, ⌈N/4⌉)`. At N = 30 that is 1, ranks 2 to 3 and ranks 4 to 8; at N = 1,000 it is
1, 2 to 10 and 11 to 100. (The weekly 期百 has the same issue today; it is out of scope here, so it is
listed in decision 10 rather than changed.)

**D6. 鎮塔十傑 after Season 0 would go to the same ten for ever (rule: late joiner).**
The Tower board is an all-time account best that never resets, and a veteran gains a few floors a
mark. From Season 1 a newcomer could never enter its top 10.
*Fix:* 鎮塔十傑 Top Ten of the Tower is a **Season 0 title only**, where everybody started at the
switch. A tower title for later chapters waits for the chapter's content (decision 11).

**D7. A rebirth between syncs loses the old life's last stretch (rule: nothing taken for being away).**
"A new life: `lifeRoad(after)`" drops what the old life walked between the last verified sync and
the rebirth, and "several rebirths between syncs ... never more than the life now shows" drops
whole lives. A player who syncs rarely (or plays offline for days) would get fewer li than one
who syncs often for the same play.
*Fix:* across a verified rebirth, credit
`max(0, end(last old life) − lifeRoad(before))` + the full `end(life)` of every life wholly between
the two syncs + `lifeRoad(after)`, where `end(life) = (RULER[80] + 50 × life.marks) × (1 − echo of
that life)`. Every one of those lives is in the `lives` record, which `verify`'s `reborn` path has
already checked against time. The D4 pace limit applies to the total.

**D8. The retroactive fill is described backwards.**
The proposal says R2 must land before the first rebirth "or the retroactive fill over-credits".
The fill `walked = lifeRoad(verified save)` only sees the current life, so for a reborn account it
**under**-credits, and `week_from` converted from the account best would make the week gain
negative (no credit).
*Fix:* fill from the lives record as in D7 (exact after rebirths too), and convert a reborn
account's `week_from` the same way. The deadline before the first rebirth then stops being hard;
it remains a good target.

**D9. "The Road" collides with a system the game already has (rule: clear to a non-native reader).**
緣 the road is already a player-facing system: "Somebody on the road, every few hours", the
`ROAD` copy block ("緣 Meetings and the road"), the 書 guide "期 The week and the road", the
closed-test card ("Its road ends here"), and `verify`'s `road` refusal. "The Road 程" next to
"緣 the road" names two different things with one word, and a column `road` collides with the
verdict `road` in `sync_log`.
*Fix:* the board is **The Journey 程**, the column `walked` (with `walked_prev`, `walked_at`), and
the module `src/sim/journey.ts`. 程 fits better as journey anyway (行程, 路程).

**D10. "Standing" already means something to the player.**
`copy.ts` uses "your standing qi rate" and "standing rate" in several sheets and the 書 guides, and
"standing in realm N" on the Stele; the code has `standing()` for the layer number and
`my_standing()`/`standings` for the board row. "Your standing in the sect" next to "your standing
qi rate" is two meanings for one word.
*Fix:* in player copy the noun is **sect rank 位** ("Sect rank: Core Disciple 核心弟子"). It always
carries "sect", so it does not collide with a place on a board. Code keeps `rung`.

**D11. Chinese: three names read wrong.**
- **大長老** is *the* Great Elder, the head of the elders: one person per sect. As a level that many
  hold, it reads like "everybody is the Chief Elder". As a small seal, **大** and **太** (the next
  level) differ by one dot. *Fix:* level 7 is **Peak Lord 峰主** (seal 峰): the master of one of the
  sect's peaks, a post many hold, above the ordinary elders, and it fits a mountain game.
- **執事** is a steward or clerk, an administrative post usually filled from the inner disciples, so
  a reader of the genre sees it as a step **down** from 真傳弟子. "Deacon" is a church word that a
  non-native reader may not know. *Fix:* level 5 is **Guardian 護法** (seal 護): the sect's
  protector, the usual step between disciples and elders (弟子, 護法, 長老).
- **門階** means the steps at a gate, a doorstep; it does not mean a sect's hierarchy. *Fix:*
  **位階** (rank order), which also carries the 位 of sect rank.
- Minor: **開山百士** is not wrong, but 百士 is not a set phrase and reads weaker beside 十傑.
  *Fix (optional):* **開山百傑**, parallel to 開山十傑.

Word by word, the rest are correct and natural: 外門弟子, 內門弟子, 核心弟子, 真傳弟子 (in that
order, the usual disciple ladder), 長老, 太上長老 (several are normal), 老祖, 位, 程, 里, 開山第一,
開山十傑, 鎮塔十傑 (鎮 as in 鎮守, to hold), 錄, and the runner-up's stones 啟程, 行腳, 遠遊, 登高, 凌雲.

**D12. English that a non-native reader may stumble on.**
- "Ten of the Founding", "Hundred of the Founding", "Ten of the Tower": the game already says
  "Top Ten of the Week". *Fix:* **Top Ten of the Founding**, **Top Hundred of the Founding**,
  **Top Ten of the Tower**.
- "li" is never explained. *Fix:* first use on every screen reads "li 里" with a 註 note:
  "li 里, a measure of distance. The Journey counts the li you walk this season."
- "A steady cultivator walks about 70 li a week" reads as a quota. *Fix:* the quiet line is
  "Every layer and every mark is li on the Journey. A day away takes nothing back." The 70 figure
  lives in the 註 note, as a comparison, not a target.
- "The Founding has closed; the Roll is written on Thursday": the close is lazy, and Thursday
  00:00 UTC is Wednesday evening in the Americas. *Fix:* "The Founding has closed. Its Roll is
  written in three days."
- "Ancestor 老祖 · 雷 23" names the marks only by a character. *Fix:* "Ancestor 老祖 · 23 marks 雷".
- No em-dash appears in the proposal or in this file.

**D13. A test bound the measurement already fails.**
`road.test.ts` asserts "gain 0.9 moves no habit's total by more than one mark". In `chap112.json`
every hour goes from 1,170 to 1,270 li at gain 0.9: 100 li, two marks, and in the wrong direction
(a slower economy walked further, because one more mark fell inside the window). The Journey is
not monotone in the economy at the scale of a mark.
*Fix:* the bound is two marks (100 li), and the text says so: past the summit the Journey moves in
lumps of 50 li, and a ±100 li spread is noise, not skill.

**D14. "70 ± 10 li a week" fails week by week.**
The ruler counts whole layers and whole marks, so a week's li is lumpy: `active` fresh walks 58 in
week 1 (a layer was about to open), and a veteran walks 0, 50 or 100 in any given week. *Fix:* the
test reads four-week windows (`active` fresh 293 li by day 30, veteran 300: 68 and 70 a week), and
the doc stops promising a weekly figure. Do not interpolate inside a layer with the qi held: qi can
be spent and re-earned, and with the `max(0, …)` ratchet that would credit the same qi twice.

**D15. The rebirth cost of the Founding is invisible (rule: honest copy).**
The Founding's close titles come from the Heaven List with `lives = 0`, so a player who reborns
during Season 0 gives them up, and Samsara carries none. *Fix:* the 轉世 confirmation says so
before the player commits: "A rebirth leaves the Heaven List, and the Founding's titles are given
from it."

**D16. Closed-test and held rows in the counts.**
`rung` and `rungs()` must read only `in_season(updated_at)` rows, or a tester who has not synced
since the switch shows a closed-test sect rank in the counts. A held account shows no sect rank to
others and counts in no level; its own screen says the rank waits for the review.

**D17. Two notices at one sync.**
Reaching Inner, Core, True or Guardian happens at a realm arrival, which is also a Cliff carving.
A `.notice` card blocks pointer events (CLAUDE.md trap). *Fix:* one card carries both lines. The
"last rank shown" is kept in the save's `seen`, so a second device does not repeat it.

**D18. Names that impersonate a rank.**
`set_name()`/`cleanName()` will refuse the season titles, but a player named 老祖 or 太上長老 beside an
Outer Disciple seal reads as a rank they do not hold. *Fix:* refuse the nine CJK level names as
whole names (not as substrings, which would block real names), with a schema test.

**D19. Counting error in the proposal.**
"Five of the nine levels sit on realm arrivals": four do (Inner, Core, True, Guardian). Outer is the
first sync and Elder the first mark. Decision 2's "five realm-gate levels" is likewise four.

**D20. When R2 lands.**
Switching This Week from layers to li in the middle of a week shows players a cell that changes
unit. *Fix:* R2 deploys on a Monday, after the lazy close of the week before.

### Checked and found sound

- **Qi rate.** Nothing in the package enters `sim/`, `validate()` or `verify()`. Sect rank and
  the Journey are read from the server's row; every reward is a name, a seal, a frame or a line.
  `walked` is uncapped and never feeds the qi rate. The drawer's Hundred bonus is not part of this.
- **Away.** A sect rank never falls, `walked` never falls, a missed chapter means no title for it,
  and the D2 and D7 fixes close the two places where syncing late counted for less.
- **Fights.** Neither number reads a fight; a lost fight or a failed floor moves nothing.
- **Faking the level.** `climb` and `marks` are maxima written only after `verify()`. The Echo in
  `lifeRoad` is not a field a player can edit: `echoFactor` is derived from the `lives` record,
  which `livesExtend` and the `reborn` path check against time, and `ECHO_ROOF` caps it at 35%.
  The D1 hole was in the proposed crediting rule, not in verify.
- **Every-hour-only thresholds.** None of the nine ranks needs the every-hour habit: Supreme Elder
  falls inside Season 0 for every hour (91), runs auto (81), crafts it all (100) and active (106),
  and nobody reaches Ancestor in Season 0. The Founding's top ranks will in practice go to the
  every-hour and Auto players who started on day 1; that is what a race is, and the copy should
  say it plainly. Past the summit Heaven is a clock of about one mark in 4 to 7 days.
- **A week 6 joiner in Season 0** has three reasons to play: sect rank (absolute lines, Core by
  day 4 to 10), This Week in li (a first week walks 30 to 110 li, against 0 to 100 for a veteran at
  the summit and about 70 for a climber), and the Cliff of Names (81 places per gate, far from full
  with today's population). With D5 the Founding's Top Hundred is still open to them at a small N.
- **Cliff of Names and 先行 Forerunner.** No conflict: the close writes nothing to `firsts`, the
  Forerunner stays its own mark, and the four ranks on realm arrivals sit on Cliff gates 1, 3, 5
  and 7, Elder on gate 9. **The weekly board** keeps its titles and close; only its unit changes.
- **R0.** Confirmed in `20261015100100_forerunner.sql`: `my_standing()` picks 天下第一 without
  `lives = 0` while `board('climb')` filters on it.
- **Dates.** 26 Oct, 2 Nov, 9 Nov, 16 Nov 2026, 18 Jan, 15 Feb and 10 May 2027 are all Mondays;
  26 Oct plus 112 days is 15 Feb, and 15 Feb plus 84 days is 10 May.
- **Measured tables.** Section 4.2's figures match `ranks/chap112.json`; the scores add up (52, 46, 53).

---

## 1. Scores

Each proposal is scored 1 to 10 on its own, as written (unchanged by the check; the fixes above
apply to the package, not to the scoring).

| Criterion | 位 Sect rank (tiers) | 季路 Season Road (pass) | 章 Chapters |
|---|---|---|---|
| Clear to a player | **9** | **6** | **6** |
| Feels earned | **7** | **6** | **8** |
| Fair to casual and late players | **8** | **7** | **9** |
| Hard rules and the last-wipe promise | **10** | **7** | **9** |
| Buildable soon | **9** | **5** | **6** |
| Gives competitive players something | **4** | **7** | **8** |
| Discord-friendly (news every week) | **5** | **8** | **7** |
| **Total (of 70)** | **52** | **46** | **53** |

The reasons per cell are in `SEASON-RANKS.md` section 1. Sect rank answers "what am I" for the
life of the save; Chapters answers "who walked furthest this season". The package takes both.

---

## 2. The package in three sentences (as a player reads it)

1. **Your sect rank 位, from Outer Disciple 外門弟子 to Ancestor 老祖, is set by the realms you have
   opened and the thunder marks you carry. The server grants it only after checking it against real
   time, and it never falls: not for being away, not for a rebirth, not when a season ends.**
2. **The Founding 開山 is the race up the mountain. When it closes, the first on the Heaven List and
   the best behind them, and the best in the Tower, are named for it for good.** [fixed D5]
3. **Every season after it is a chapter on the same mountain. The Journey 程 counts the li 里 you
   walk during the chapter, on one ruler for everyone, so a newcomer and a veteran race on the same
   board.** [fixed D9, D12]

---

## 3. The levels: 位 Sect rank

**Score = `climb + marks`**, both read from `public.standings` (the account's verified bests, only
written by `sync` after `verify()`, both only rise). The Tower is left out on purpose: it pays out
in one lump at realm 5, and idle habits sit at floor 0. A sect rank is derived, never stored.

| # | Sect rank | Seal | Score | How it is reached |
|---|---|---|---|---|
| 1 | Outer Disciple 外門弟子 | 外 | 0 | first verified sync |
| 2 | Inner Disciple 內門弟子 | 內 | 9 | arrive in Foundation (realm 2) |
| 3 | Core Disciple 核心弟子 | 核 | 27 | arrive in Nascent Soul (realm 4) |
| 4 | True Disciple 真傳弟子 | 真 | 45 | arrive in Void Refining (realm 6) |
| 5 | **Guardian 護法** [fixed D11] | 護 | 63 | arrive in Great Vehicle (realm 8) |
| 6 | Elder 長老 | 長 | 81 | the summit and the first thunder mark |
| 7 | **Peak Lord 峰主** [fixed D11] | 峰 | 85 | 5 marks |
| 8 | Supreme Elder 太上長老 | 太 | 90 | 10 marks |
| 9 | Ancestor 老祖 | 祖 | 100 | 20 marks |

Above 20 marks the Ancestor's line shows the count: "Ancestor 老祖 · 23 marks 雷" [fixed D12].
There is no tenth level until new content extends the climb. Four ranks sit on realm arrivals,
one on the first mark and three past it [fixed D19].

**Measured: the day each rank is first reached** (`measure.json`, `measure-auto.json`):

| Habit | Inner | Core | True | Guardian | Elder | Peak Lord | Supreme Elder | Ancestor |
|---|---|---|---|---|---|---|---|---|
| never fights | 2 | 10 | 38 | 90 | not by 100 | | | |
| once a day | 1 | 7 | 24 | 57 | after 100 | | | |
| casual | 0.7 | 4.3 | 21 | 50 | 81 | 101 | 123 | 187 |
| active | 0.5 | 3.5 | 15 | 37 | 60 | 81 | 106 | 159 |
| crafts it all | 0.5 | 3.5 | 13 | 33 | 59 | 80 | 100 | 149 |
| every hour | 0.1 | 2.0 | 9.3 | 24 | 40 | 62 | 91 | 164 |
| runs auto | 0.3 | 2.3 | 9.5 | 24 | 39 | 57 | 81 | 138 |

Inside a 16-week Season 0 (112 days) every habit reaches at least True Disciple, four habits reach
Supreme Elder (days 81 to 106), and nobody reaches Ancestor, so Season 1 opens with the top rank
still ahead of everyone. Real testers ran faster than the harness, so expect the first Elders
about a week earlier.

**Rules that hold it to the promise** (`rung.test.ts`): thresholds rise strictly; a later release
may lower a threshold but never raise one; a reborn account keeps its rank (it is the account's
best, like `climb`); The Hundred, if ever built, never feeds it; `rung_of` and `rungs()` read only
`in_season` rows and leave out held and banned accounts [fixed D16]; the nine CJK names are refused
as whole player names [fixed D18].

---

## 4. The ranking numbers, board by board

| Board | Ranks by | Filter | Cell | Titles | Change |
|---|---|---|---|---|---|
| 期 This Week | `walked − week_from`: li gained since Monday 00:00 UTC (time-shared at the week's first verified sync, as `weekStart()` does now); ties `walked_at` asc | `week = week_of()`, gain > 0, not suspect, not banned, `in_season` | `+58 li` | 期首 / 期十 / 期百, worn the next week, as now | **moves from layers to li** (R2, on a Monday) [fixed D20] |
| 天 Heaven List | `climb` desc, `marks` desc, `climbed_at` asc | `lives = 0`, as on the branch | as now | 天下第一 live; Season 0 close titles | rank seal on each row |
| 塔 The Tower | `tower` desc, `tower_at` asc | `tower > 0` | `floor N` | **Top Ten of the Tower 鎮塔十傑**, Season 0 close only [fixed D6] | rank seal on each row |
| 輪迴 Samsara | as built | `lives > 0` | as built | none until D8 (the old decision) | rank seal on each row |
| 程 The Journey (from Season 1) | `walked` desc, `walked_at` asc | `chapter_of(now)`, `walked > 0`, not suspect, not banned | `812 li` | the chapter's close titles (section 5) | **new** [fixed D3, D9] |

### 4.1 The ruler and `walked`

- **The ruler.** `RULER[k]` is 10 × the day the `active` habit opened its k-th layer: 81 integers,
  generated by `tools/ruler.ts` and pinned in `src/sim/balance.ts`. Realm starts in li: R2 5,
  R3 12, R4 35, R5 83, R6 147, R7 242, R8 365, R9 497, summit 572.
- **Marks.** `MARK_LI = 50`, about the reference cultivator's 5 days a mark.
- **A life's position.** `lifeRoad(save) = (RULER[layers this life] + 50 × marks this life) × (1 − echo)`,
  with the echo derived from the save's `lives` record (verified, capped by `ECHO_ROOF` at 35%).
  It only rises within a life. Whole layers and whole marks only: never qi held, which can be spent
  and earned again [fixed D14].
- **`walked`**, a new column on `standings`: li walked this chapter, summed over verified syncs.
  - **Same run, same life:** `max(0, lifeRoad(after) − lifeRoad(before))`.
  - **Same run, verified rebirth** (`livesExtend` with more lives, verify's `reborn` path): the old
    life's last stretch, plus every whole life between the syncs, plus `lifeRoad(after)` (D7's
    formula), under the rebirth pace limit of decision 6 [fixed D4, D7].
  - **Another run** (another `startedAt`): `max(0, lifeRoad(after) − lifeRoad(prev))`, never the
    whole run [fixed D1].
  - **First verified sync of a chapter, or a sync across a chapter boundary:** the gain is split by
    time with the `weekStart` arithmetic; the part before the boundary goes to `walked_prev`.
- **This Week.** `week_from` holds `walked` at the start of the week, so This Week is
  `walked − week_from`. A reborn life earns week credit from its first layer, within the decision 6
  limit, which closes the DRAWER's Rebirth open item 1.
- **No Journey board in Season 0.** Everybody starts at zero at `SEASON_START`, so for every account
  that has not reborn `walked` orders exactly as the Heaven List does. The column still runs from
  the switch: it drives This Week, shows on the player's own card ("1,070 li walked in The
  Founding") and goes on the Stele at the close.

### 4.2 Measured: the Journey over a 16-week season (`ranks/chap112.json`)

li walked by season day 7, 30 and 112, from four starting points:

| Habit | Fresh d7 | Fresh d30 | Fresh d112 | Mid-climb (life day 30) | Veteran (from its summit) |
|---|---|---|---|---|---|
| never fights | 30 | 135 | 475 | 435 | 550 |
| barely fights | 33 | 135 | 570 | 635 | 550 |
| once a day | 33 | 185 | 770 | 835 | 950 |
| casual | 58 | 205 | 920 | 1015 | 1000 |
| active | 58 | 293 | 1070 | 1077 | 1100 |
| drives it all | 70 | 293 | 1070 | 1027 | 950 |
| walks 神 | 70 | 308 | 1070 | 1012 | 950 |
| crafts it all | 72 | 308 | 1170 | 1212 | 1250 |
| every hour | 110 | 460 | 1170 | 960 | 900 |
| runs auto | 97 | 460 | 1320 | 1110 | 1100 |

For a 12-week chapter the Chapters tables hold: fresh starts walk 348 to 1070 li, veterans 450 to
900, and active 800 to 830 from every start.

What the numbers say:
- **A veteran and a newcomer walk about the same** over a whole chapter (veterans 550 to 1250,
  fresh 475 to 1320), where today's This Week gives 25 to 42 against 1 to 2.
- **Weekly li are lumpy** [fixed D14]: a climber's week moves by whole layers, and a veteran's by
  whole marks, so a veteran's week is 0, 50 or 100 li. Over four weeks `active` walks about 70 a
  week from any start.
- **Past the summit effort counts for little**: the endgame is a clock of about 5 days a mark.
  That is the game's shape, and why the Tower has its own Season 0 title.
- **Marks make the Journey noisy** [fixed D13]: at gain 0.9 every hour walked 1,270 li instead of
  1,170, two marks more in a *slower* economy. Expect ±100 li between veterans; no title hangs on a
  threshold, only on rank bands.
- **Rebirth is the dominant Journey strategy without a limit** [fixed D4]: a reborn every-hour life
  walks about 112 li a week against 58 at the summit. Decision 6 settles it before R2.

---

## 5. The season end

### Season 0, The Founding 開山

- **When it closes.** On a Monday at 00:00 UTC, **no sooner than Mon 15 Feb 2027** (16 weeks),
  announced at least 4 weeks ahead (by Mon 18 Jan 2027). The exact date is 師 Shibaki's call,
  ideally the day Season 1's content arrives. 16 weeks lets a once-a-day player reach the summit
  inside the season (day 90).
- **The snapshot** [fixed D2]. At each account's first verified sync after the boundary, before the
  sync is applied, the server writes `season_snap('s0', …)`: climb, marks, tower, their times and
  `walked`, with the gain since the last verified save split by time at the boundary (rounded down).
- **How it closes.** `close_season('s0')` runs lazily at the first sync from three days after the
  boundary. It ranks from `season_snap` where an account has one and from `standings` where it has
  not synced since. It is safe to repeat, and leaves out held and banned accounts, as `close_week`
  does.
- **What it writes** [fixed D5, D11, D12]. N is the number of ranked accounts on that board.
  - **From the Heaven List** (`lives = 0`, as the board filters):
    - rank 1: **First of the Founding 開山第一**
    - ranks 2 to `min(10, max(2, ⌈N/10⌉))`: **Top Ten of the Founding 開山十傑**
    - the ranks after that up to `min(100, ⌈N/4⌉)`: **Top Hundred of the Founding 開山百傑**
  - **From the Tower:** rank 1 to `min(10, max(1, ⌈N/10⌉))`: **Top Ten of the Tower 鎮塔十傑**.
  - **`season_roll(season, user_id, name, rung, walked, heaven_rank, tower_rank)`** for every
    verified account with a Season 0 row. Its public view returns no ids or emails.
- **What it leaves alone.** The Cliff of Names and 先行 Forerunner stay Season 0's for good. Nothing
  at the close writes to `firsts`. `in_season()` and `season_start()` never move [fixed D3].

### Every later chapter (Season 1 onward), on the same save

- **Length.** 12 weeks each, Monday to Monday at 00:00 UTC, counted by `chapter_of(t)`, never by
  `in_season()` [fixed D3]. If Season 0 closes on its earliest date, Season 1 runs 15 Feb to
  10 May 2027.
- **The first second.** `walked` starts at 0 for everybody, and the save does not notice: no realm,
  mark, floor, item, Echo or name changes, the save keeps `season: 's0'` and syncs as before, and
  Heaven, Tower, Samsara, This Week, the Cliff and Forerunner carry on.
- **Close titles** come from **the Journey**, with the same snapshot, grace and bands as Season 0:
  First of <chapter name> (<name>第一), Top Ten of <chapter name> (<name>十傑), Top Hundred of
  <chapter name> (<name>百傑). No tower title until a chapter's content defines one [fixed D6].
- **The ruler** is regenerated only at a boundary, never mid-chapter. The Roll records ranks and
  sect ranks, never compares li across chapters.
- **The Hundred**, if ever built, is an optional side life on the chapter clock (D1). Its climb
  never counts on the Journey and never feeds a sect rank.
- **Naming.** The drawer already calls The Hundred 季榜, so the chapter board is 程 The Journey.

### What a title does

- Worn on the one `.wears` line through the whole next chapter, then kept on the Stele and in the
  Roll for good.
- Priority on that line: 天下第一 > season first > 期首 > season top ten > 期十 > season top hundred
  > 鎮塔十傑 > 期百.
- `set_name()` and `cleanName()` refuse every season title, as they refuse 期首 now, and the nine
  rank names as whole names [fixed D18].

---

## 6. Rewards (cosmetic only)

| Reward | Who | How long |
|---|---|---|
| Rank seal and English name on every board row, at the head of Ranks and on 修 Cultivate | every verified account | for good |
| One notice "The sect raises you to True Disciple 真傳弟子.", merged with a Cliff carving if both land at one sync [fixed D17] | once per rank; after a return, only the highest new rank | once |
| A frame on the player's own board row | Elder and above | for good (art: needs the 圖 mockup) |
| Season close titles (section 5) | the bands on Heaven (Season 0) or the Journey (later), Season 0's Tower band | worn for one chapter, recorded for good |
| A Stele line, e.g. "開山 The Founding · Peak Lord 峰主 · 1,070 li · 37th on Heaven" | every account in the Roll | for good |

Nothing touches qi, material, items or time: a sect rank is read from the server's row, which
`sim/` never sees; `walked` is uncapped and so may never feed the qi rate; neither enters
`validate()` or `verify()`; losing a fight moves neither.

---

## 7. On screen (in words; mockups required before building)

This is a visual change. Per CLAUDE.md it ships only with Playwright screenshots at **320 and
400** from fabricated saves stamped `season: 's0'` and `seen: [..., 'whom']`, and a 樣 block in
`tools/bible.ts`.

### 榜 Ranks, the head (我)

```
 [核]  Core Disciple 核心弟子
       ▮▮▮▯▯▯▯▯▯   9 layers to True Disciple
       293 li 里 walked in The Founding · +58 li this week
```

- **The seal** is the rank's character in a small stamped square, coloured by gate: celadon, gold
  leaf, copper, plum, then imperial violet for the mark ranks. 峰 and 太 are distinct at seal size
  [fixed D11]; check it at 320.
- **Tapping the seal** opens **The Sect's Ladder 位階** [fixed D11]: the nine ranks, what reaches
  each, and how many hold each (from `rungs()`). The player's own row is highlighted.
- **Signed out:** "Sign in and the sect will record your rank." [fixed D10]
- **Held for review:** "Your sect rank returns when the review is done."
- **A name nudge.** A player still named 修士 who reaches Inner Disciple sees one line they can
  dismiss: "An Inner Disciple is known by name. Choose yours." (the 15 Oct thread about 修士 names
  "from nowhere").

### Board rows

- The seal sits before the name; the second line leads with the rank, then the calling:
  "Core Disciple · Swordsman".
- This Week's cell reads "+58 li". A newcomer topping the week reads "+110 li · Core Disciple", and
  the veteran under them "+50 li · Elder".

### Tabs

- **Season 0:** 期 This Week · 天 Heaven · 塔 Tower · (輪迴 Samsara), as built.
- **From Season 1:** **程 The Journey** first, then the same four; Ranks opens on the Journey
  during a chapter until the player picks another tab. Check the tab row at 320.

### At the close

- For three days the head says "The Founding has closed. Its Roll is written in three days."
  [fixed D12]
- Then 錄 The Roll appears beside the Cliff's door: one card per past season (its titles, how many
  held each rank, the player's own line).

### 修 Cultivate

- The `.wears` line leads with the rank: "Core Disciple 核心弟子 · 期十 Top Ten of the Week · 先行".
  Only when the save is verified; if the phone is ahead of the server, it shows the server's rank.
  It wraps at 320, so check it there.

### 轉世 The rebirth confirmation [fixed D15]

- In Season 0 it adds: "A rebirth leaves the Heaven List, and the Founding's titles are given from it."

### Traps to respect

- The seals are a new 註 surface: through the portal into `document.body`; `npm run tips` must pass.
- Scope new classes to their screen (`.rankhead .seal`, `.roll .card`), never a shared `.level`.
- The rise notice and a Cliff carving share one `.notice`, which blocks pointer events.

### Copy

- In `src/app/copy.ts` (`RANKS.sect…`, `RANKS.journey…`), English first with characters alongside,
  no em-dashes. The unit is always "li", with "li 里" and its 註 note at first use on a screen
  [fixed D12]. The noun is "sect rank", never "standing" [fixed D10]. The board is "The Journey",
  never "the road" [fixed D9].
- The quiet line under the Journey: "Every layer and every mark is li on the Journey. A day away
  takes nothing back." [fixed D12]
- Title names in `RANKS.titleNames`: "First of the Founding", "Top Ten of the Founding", "Top
  Hundred of the Founding", "Top Ten of the Tower".
- The 書 Rankings guide in `tools/discord/server.json` changes in the same commit, and the 期 guide
  ("The week and the road") keeps "the road" for 緣 only.

---

## 8. Build plan

Nothing is published until 師 Shibaki has seen the pictures and approved the players' words. Each
push carries its devlog line.

| Push | When | What | Size |
|---|---|---|---|
| **R0** | on the branch, before Season 0 reaches main | `my_standing()` picks 天下第一 with `lives = 0` (RANKS-NOW 2.5), with a schema test | a few lines of SQL |
| **R1 Sect rank** | season week 2 (from Mon 2 Nov), **never before `SEASON_START`** | the ranks; pieces below | about one session |
| **R2 Journey** | a **Monday** in season week 3 (9 Nov), **after decision 6** [fixed D4, D20]; ideally before the first rebirth (about 16 Nov), no longer a hard deadline [fixed D8] | the Journey column and This Week in li; pieces below | about one and a half sessions |
| **R3 Close** | announce by Mon 18 Jan 2027, deploy before the close | the snapshot, the close, the Roll, chapters; pieces below | about one and a half sessions (the snapshot adds to it) |
| **R4 (optional)** | any time after R1 | a scheduled workflow posting one Monday line to the devlog (last week's 期首 and 期十, rank counts, new Cliff carvings), from public board data; its Action log prints counts, never names | small |

**R1 Sect rank:** `RUNG_AT` in `balance.ts`; a pure `src/sim/rung.ts` (`rungOf`, `nextRung`,
`RUNGS`); a migration with `rung_of()`, a `rung` column on `board()`, `samsara_board()` and
`my_standing()` (dropped and recreated), `rungs()` (counts only, `in_season`, no held or banned)
and the nine names in the name refusal; `cloud.ts`, `useCloud.ts`; in `Ranks.tsx` the head line, the
ladder sheet, the row seals, the name nudge; in `Cultivate.tsx` the `.wears` line and the merged
rise notice; panel counts.

**R2 Journey:** `RULER` and `MARK_LI` in `balance.ts` from `tools/ruler.ts`; a pure
`src/sim/journey.ts` with `lifeRoad`, `lifeEnd`, the crediting rule of 4.1 (same life, rebirth,
another run) and `chapter_of`; columns `standings.walked`, `walked_prev`, `walked_at`; in
`supabase/functions/sync/core.ts` the credit, the rebirth pace limit and the boundary split; This
Week ranked by `walked − week_from` with "+N li" cells; a retroactive fill from each verified save
and its lives record, with `week_from` converted the same way [fixed D8].

**R3 Close:** `season_snap` written at the first sync after a boundary [fixed D2]; `close_season()`
with population bands [fixed D5] and the `season_roll` table and its public view; close titles in
`titles(board = 'season')`, the `title_of()` priority and the name refusals; the Stele line and the
Roll view; the Journey board and tab, hidden until Season 1; `chapter_of` in SQL, with
`in_season()` left on the Founding [fixed D3]; the Season 1 ruler, pinned; the rebirth warning
[fixed D15].

**Tests and checks for each push:**
- **`rung.test.ts`:** thresholds rise strictly; none raised against the last release; each habit's
  rank at days 1, 7, 30 and 90 printed for the bible.
- **`journey.test.ts`:** the ruler only rises; `active` walks 70 ± 10 li a week **averaged over
  four-week windows** from fresh, mid-climb and summit starts, with a floor on the count
  [fixed D14]; gain 0.9 moves no habit's total by more than **two marks** (100 li) [fixed D13];
  two leapfrogging runs are credited the furthest walk once [fixed D1]; a rebirth between syncs
  credits the old life's last stretch and every whole life between [fixed D7]; a reborn life stays
  under the decision 6 limit.
- **Core tests:** same life, rebirth, several rebirths between syncs, another run, first sync of
  a chapter, the boundary split, the snapshot written before the sync is applied, and a sync inside
  the three-day grace that does not move the closed season's ranks [fixed D2].
- **Schema test:** `rung_of` equals `rungOf` for every score from 0 to 120; `rungs()` and the
  Roll's view return no ids or emails; `season_start()` is unchanged and a Season 0 save syncs
  after a chapter boundary [fixed D3]; the nine rank names are refused as names.
- **`tools/ranked.ts` against the live server:** a player cannot write `walked` or `rung`; a held
  account counts in no rank and on no board.
- **The usual:** `npm run tips`, `han`, `smoke`, `arena`; the 樣 mockup block; screenshots at 320
  and 400.

---

## 9. Decisions this leaves for 師 Shibaki

1. **The package:** sect rank for levels, the Journey for later chapters, Heaven and Tower for
   Season 0's close. Or the runner-up (section 10).
2. **Sect rank, full or short:** all nine, or Outer Disciple and then Elder and above, if the
   **four** realm-gate ranks feel like renamed realms [fixed D19].
3. **Names:** the nine ranks with **Guardian 護法** and **Peak Lord 峰主** (recommended) or the
   original Deacon 執事 and Great Elder 大長老; "The Journey 程"; the close titles 開山第一 /
   開山十傑 / 開山百傑 (or 百士) / 鎮塔十傑; "sect rank" as the noun.
4. **Season 0's close:** Mon 15 Feb 2027 (16 weeks), or tied to Season 1's content.
5. **Later chapters:** 12 weeks (the drawer's length for The Hundred), or 8 or 10.
6. **Rebirth on the Journey and This Week, before R2** [fixed D4]: accept it (serial rebirth wins
   the weeks from about week 6), or the default: a reborn life credited at most 1.5 times the
   reference pace, the rest waiting.
7. **Does a reborn account keep its rank?** The package says yes.
8. **This Week in li:** in R2, or left in layers.
9. **R4:** the automatic Monday line in Discord, yes or no.
10. **Population bands** [new, D5]: the proportional bands of section 5, or fixed top 10 and top
    100. And whether the weekly 期十 / 期百 get the same bands.
11. **A tower title after Season 0** [new, D6]: none, or one ranked by floors climbed in the chapter.

---

## 10. The runner-up: Chapters in full

`season-chapters.md` as written: the Journey board from the switch, and **five stones per chapter**
as the levels, with no lifetime rank. In a 12-week chapter: Setting Out 啟程 30 li, Wayfarer 行腳
120 li, Far Traveller 遠遊 300 li, High Climber 登高 480 li, Cloud Treader 凌雲 640 li.

**Choose it if** every player, veterans included, should have a fresh goal each chapter: `active`
reaches Cloud Treader on day 67 from a fresh start and on day 64 as a veteran.

**What it costs:** a new unit carries everything; no lifetime "what I am"; in Season 0 its board
says what Heaven says; the stones need resizing for a 16-week Season 0. **It shares the D1, D4 and
D7 fixes**, since it credits li the same way.

**Not recommended: the Season Road 季路 (pass):** eight sources, shares and held points before a
player sees a level, a new `verify` bound, two sessions plus art, and its top habits finish by day 52.
The package took from it the refusal to pay points for This Week, the furnace or drives, the Stele
line for everyone, and the share mechanism (now the default of decision 6). **Worth doing on its
own:** the walk-count bound it found missing in `verify` (`state.runs` never falls, and rises by at
most `floor(dt / shortestDoorGap) + new keys + 1`).

---

## 11. Rules check

- **Nothing uncapped raises the qi rate.** Neither the rank nor `walked` enters the sim; every
  reward is a name, a seal, a frame or a line.
- **Nothing is taken away for being away.** The rank and `walked` never fall; a missed chapter means
  no title for it; the boundary split and the snapshot credit an absent player on both sides
  [D2]; a rebirth between rare syncs is credited in full [D7]; an absent account never drops off
  Heaven at a chapter's start [D3].
- **Losing a fight costs nothing.** Neither number reads fights.
- **Season 0 is the last wipe.** Every later season is a chapter on the same save; the save keeps
  `season: 's0'`; The Hundred stays an optional side life and never counts.
- **English first, characters alongside, no em-dashes**, in every name above; marks are written
  "23 marks 雷", li "li 里" at first use.

## 12. Risks

- **Sect rank could feel like a renamed realm.** The server grants it, each rank spans two realms,
  and four ranks lie past the summit. The short version is the fallback.
- **The endgame is a clock.** Past the summit the Journey separates habits by about 20%, not by
  effort; the Tower's Season 0 title is where effort past the summit shows.
- **Rebirth could drive the Journey and the weeks** (decision 6), from about week 6 of Season 0.
- **The harness is slower than the testers.** Real players reached floor 352 and ran Auto overnight
  on a PC: expect the first Elders about a week before day 39, and real li above the tables.
- **A small population** makes every band generous; D5's bands scale with it.
- **Screen risks:** the `.wears` line at 320, the seals as a new tooltip surface, the tab row at 320.
- **The suspect thresholds matter more** once a close hands out titles (`SUSPECT_DAY` 0.9 and
  `SUSPECT_WEEK` 0.40, against 0.70 and 0.34 for the fastest honest habit). Held accounts are left
  out of the close, and come back to the boards, not to a title already given.
- **Device-only players** see no rank and no Journey: a mild nudge to sign in; their local Stele
  line is untouched.
