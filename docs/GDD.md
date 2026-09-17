# 九重 Ninefold — the game bible

A free mobile idle cultivation game. Portrait, one hand, Godot, Android first.

> **The one line.** You sit still and gather qi; you get up and hunt. Both work. The
> game never stops you doing either, and the whole design is the shape of that trade.

---

## 0 · What decides everything else

Three findings from an earlier, fully playable build. They were measured by running it,
not guessed, and every section below exists because of one of them. They are first in
this document so that no later decision quietly contradicts them.

**Finding 1 — the climb was front-loaded to the point of collapse.** Realms 1 to 6
arrived in six days. Realm 8 to 9 took twenty-six. Fifty-seven percent of a playthrough
sat in a single gap, with nothing new in it.

```
idle-only realm arrivals, by day   2:1  3:1  4:1  5:2  6:3  7:5  8:16  9:56
                                                              └── 40 of 56 days ──┘
```

**Finding 2 — novelty collapsed before the content did.** 57.6 first-time events in week
one; roughly one per week by week seven. Players did not run out of game, they ran out of
*new*, which is a different and worse problem.

**Finding 3 — half of what was built was never seen.** Three of six wardens and four of
eighteen beasts were unreachable inside a normal playthrough. Content that nobody reaches
is not content, it is cost.

**The rule these produce, and the one this document is held to:** *new power is paid for
in the cost table, never by taking the power back out.* Nerfs teach players that
progress is a lie. Raising a cost teaches them the mountain is tall.

---

## 1 · The loop, at four scales

| scale | what the player does | what changes |
|---|---|---|
| **a minute** | watches the qi ring fill, reads the trail | nothing; this is the resting state and it must be pleasant |
| **a session** (2–6 min) | spends banked qi on hunts, or holds it for the gate | a realm layer, a few materials |
| **a day** | the trail turns over four times; the hunt count resets | a channel opened, an art advanced |
| **a week** | a realm, maybe two | a new ground, new beasts, a warden |

An idle game is played **closed**. The app is in the background for twenty-three hours of
every twenty-four, so progress is computed from timestamps and never from frames. A
design that counts `_process` ticks loses those hours and lies about the rest.

---

## 2 · 九重 The nine realms

Nine realms, two to each 五行 phase, the ninth alone. The phase sets the colour of
everything on screen, so a screenshot of the fourth realm and one of the seventh are
different worlds.

| # | 漢字 | name | 五行 | what it adds |
|---|---|---|---|---|
| 1 | 練氣 | Qi Refining | 木 wood | — |
| 2 | 築基 | Foundation | 木 wood | the second road opens |
| 3 | 金丹 | Golden Core | 火 fire | 圓光 the halo; arts can be learned |
| 4 | 元嬰 | Nascent Soul | 火 fire | 塵 motes; the second ground |
| 5 | 化神 | Spirit Severing | 土 earth | 蓮 the lotus seat; channels open |
| 6 | 煉虛 | Void Refining | 土 earth | 環 the orbit ring; wardens become fightable |
| 7 | 合體 | Unity | 金 metal | the second halo, 柱 the column of light |
| 8 | 大乘 | Great Vehicle | 金 metal | 芒 radiating spokes; the Scar opens |
| 9 | 渡劫 | Tribulation | 水 water | 九雷 nine bolts; the ceiling |

### 九層 Nine layers to a realm

Each realm is divided into nine layers. A layer is not a second currency — it is a
**reading of the bar**: the qi needed to leave a realm, divided by nine. Opening a layer
adds **+2% to the gathering rate, compounding**, which reaches **4.97× by the ninth
realm**.

Layers exist to answer Finding 2. A realm that takes six days gives a player one event in
six days; the same realm with nine layers gives them nine. Nothing about the curve
changes — only how often the game says *something happened*.

### The ninth realm has no exit

Realm 9 is the ceiling in v1. Its cost is `INF`, its bar never completes, and the
tribulation is a state rather than a gate. What comes after it is deliberately not
designed yet — see §12.

---

## 3 · 二道 The two roads

The player is always on one of two roads and may change at any time, free.

**靜 Stillness.** Gathering runs at ×1.00 and runs while the app is closed. This is the
road the game is balanced around: *a player who only ever opens the app once a day still
reaches the ninth realm.* That promise is load-bearing and no feature may break it.

**動 Motion.** Hunting. Each hunt spends qi and returns materials. The haul decays within
the day; the qi does not come back.

The two are not a class choice or a build. They are the same cultivator deciding, right
now, whether this hour's qi becomes a realm or becomes a satchel.

---

## 4 · 狩 Hunting, without a ceiling

The earlier build capped hunting at four charges a day. A cap protects fairness by
**blocking** the player, which is the worst way to protect it: once the four were spent
there was nothing left to press and the evening was over.

Two soft brakes replace it, and **neither ever says no**:

**The haul decays.** Hunt *n* of a day returns

```
h(n) = 1 / (1 + (n − 1) / K)        K = 5
```

Never zero, never refused. The player always sees what they are trading.

**The hunt costs qi** — specifically, **half an hour of your own current rate**. Not a
flat number: a realm-8 cultivator's half hour is worth vastly more than a realm-1's, so
the trade feels identical at both ends of the game.

What that produces:

| hunts in a day | materials, vs. four hunts | share of the day's qi |
|---|---|---|
| 4 | ×1.00 | 8% |
| 8 | ×1.61 | 17% |
| 20 | ×2.67 | 42% |
| 50 | ×3.9 | 104% — you are going backwards, and you chose to |

**Five times the play buys 2.7×.** The active player is clearly rewarded; the once-a-day
player does not fall far enough behind to quit; the player who hunts fifty times trades
their realm away with their eyes open. The wall is the curve, not a rule.

> `K = 5` comes from a model, not from play. It is the first number to re-tune against a
> real simulator, and the test suite prints the advantage figures on every run so a
> change to it is never silent.

### 蹤 The trail

What stands on a ground rotates every **six hours**, on a deterministic schedule derived
from the clock — so two devices looking at the same ground at the same second agree
without asking a server.

The trail is the answer to "why open the app more often?". Opening it more does not hunt
*more* — it hunts *better*, because you can decline a bad target and take a good one.
**Attention buys quality, never quantity.** That distinction is what keeps a free idle
game from becoming a chore.

---

## 5 · 三道 The three paths

Chosen at the start, changeable once per realm at a cost. Each must be legible **in
silhouette alone**, or it is a stat block with a colour swap.

| | 漢字 | carried as | what it does |
|---|---|---|---|
| **sword** | 劍 | straight, point-up past the shoulder | steady: the flattest haul curve, best at high hunt counts |
| **blade** | 刀 | single-edged, curved, low across the body | burst: the first three hunts of a day return more, then falls off hard |
| **bow** | 弓 | pushed forward in the off hand, quiver behind | reach: can hunt the *next* ground one realm early, at a qi penalty |

The bow's rate curve must be genuinely different from the other two or it does not ship.
A third path that is "sword but 4% more" is worse than two paths.

---

## 6 · Permanent power

Qi is spent and gone. Three things are not, and they are the spine of long-term
progression:

**經脈 Channels** — the slowest and the biggest. Opened with materials, each adds a flat
multiplier to gathering. Twelve of them; opening all twelve is a months-long project.

**術 Arts and mastery** — learned from scrolls, advanced by use. An art changes *how* a
hunt resolves, not just its numbers: one lets you decline a trail without spending the
window, another banks a hunt for later.

**器 Gear** — forged from beast materials. Modest multipliers, but it is the visible
reward loop: a drop becomes a thing you can see.

Deliberately: **no gacha, no energy, no timers you pay to skip.** The game is free and
stays free. If it ever earns money it will be from cosmetics that change the 五行 palette
and nothing that touches the curve.

---

## 7 · 地 The grounds and 獸 the beasts

Six grounds, three beasts each, opening as realms are reached. Each ground has a phase
that tints it and a warden that closes it.

| ground | 漢字 | opens at | beasts | 妖王 warden |
|---|---|---|---|---|
| Ash Slopes | 灰坡 | realm 1 | 灰兔 hare · 鐵甲蟲 beetle · 棘伯勞 shrike | 灰王 The Grey King |
| Reed Marsh | 蘆沼 | realm 2 | 青蛇 serpent · 仙鶴 crane · 月蟾 toad | 沼君 The Marsh Lord |
| Cinder Wood | 燼林 | realm 4 | 九尾狐 fox · 石猿 ape · 燈蛾 moth | 燼母 The Cinder Mother |
| Thunder Ridge | 雷脊 | realm 5 | 雷虎 tiger · 鐵根彘 boar · 霜猞 lynx | 雷君 The Thunder Sovereign |
| Sunken Palace | 沉宮 | realm 7 | 天鵬 roc · 玄武龜 turtle · 溺蛟 drake | 沉宮守 The Palace Guardian |
| The Scar | 天裂 | realm 8 | 炎麒麟 qilin · 陰魂 wraith · 九頭蟒 hydra | 裂天 Skysplitter |

**Finding 3 applies here.** Three wardens and four beasts were unreachable in the old
build. The opening schedule above is set so that every ground is reached by realm 8, and
the 8→9 gap — the longest stretch in the game — is where the Scar's three beasts and
Skysplitter live. The longest wait gets the newest content, not the emptiest.

**Wardens** are the same beast elevated: bigger, crowned, with a domain of qi around
them. They are fightable from realm 6, and beating one permanently improves that ground's
trail quality.

**Humanoids** — 魔修 deviant cultivators and sect rivals — appear on grounds from realm 5.
They drop what beasts do not: scrolls, talismans, sect coin.

---

## 8 · Currencies

| | 漢字 | earned by | spent on |
|---|---|---|---|
| **qi** | 氣 | time | realms, hunts |
| **insight** | 悟 | killing beasts | channels, arts |
| **materials** | — | hunts | gear, pills |
| **sect coin** | 幣 | humanoids, dailies | the one thing you can buy: trail rerolls |

Five material tiers, the 五階 ladder: 凡 Common · 靈 Spirit · 玄 Mystic · 地 Earth ·
天 Heaven. The tier is carried by the item's **frame**, so a player reads rarity across a
grid without reading a word.

---

## 9 · Art

The full system is `docs/ART.md`. In one paragraph: nothing is illustrated. A realm is a
contour figure plus a halo count; a beast is a 饕餮 mask plus a frame; an item is a flat
mark plus a rarity tile. Everything is generated from rules, in one palette, on one
lacquer ground — so the library cannot drift, which is what destroyed the previous one.

**What the art must carry, in order of importance:** the realm you are in, the rank of
what you are looking at, and whether something happened. Beauty is third. An idle game is
read a hundred times a day and admired twice.

---

## 10 · Screens

Four, reachable by one bottom bar. No menus more than two deep.

**今 Now** — the home. The realm in 漢字, the qi ring with the cultivator inside it, the
two roads as cards, the current trail with one beast on it, the satchel row.

**道 Path** — channels, arts, the path choice. Where banked insight is spent.

**獵 Hunt** — the six grounds, what stands on each, the countdown to the next trail.

**藏 Satchel** — materials, gear, the bestiary of what has been killed.

The bestiary is doing double duty: it is the collection screen *and* the answer to
Finding 2, because a seal that fills in is a first-time event that costs nothing to
produce.

---

## 11 · Technical

**Godot 4.3**, Compatibility renderer, portrait 1080×1920, `canvas_items` stretch with
`expand`. Android first; iOS is not a v1 target.

Four rules, each of which the earlier build broke at least once:

1. **`sim/` is pure.** No nodes, no signals, no `Time.get_ticks`, no randomness that is
   not a stable hash of the state. Everything is a function from `(state, instant)` to a
   new state. This is what lets the same code run the game, the tests and a fifty-day
   simulation.
2. **Time is a timestamp, never a frame.** `advance(state, now)` is the only way time
   moves, and one long absence must pay exactly what many short ones pay. There is a test
   for this and it has caught a real bug.
3. **A save is input.** It is validated like any other input. The earlier build shipped
   without this and had a hole where a hand-edited heirloom multiplied the qi rate by
   196,502× and passed every check.
4. **Balance numbers live in one table**, are printed by the test suite on every run, and
   changing one is therefore never silent.

---

## 12 · What is measured, and what is open

**Measured and settled:** the haul decay curve and its advantage figures; the layer
multiplier reaching 4.97×; offline progress paying identically in one step or many.

**Open, and blocking:**

- **Realm 9's cost.** With nine layers added, an idle-only run still puts 71% of its days
  in the 8→9 gap. Subdividing a curve was never going to fix a curve whose *last step* is
  the problem. This number needs to come down, and the content that fills the gap needs
  to be in place before it does.
- **`K = 5`** in the haul decay, against a real simulator rather than a model.
- **The bow's curve.** If it cannot be made meaningfully different, the game ships with
  two paths.

**Open, not blocking:** how many channels; whether gear has sockets; whether wardens
respawn.

---

## 13 · Not in v1

Multiplayer, sects, PvP, trading, leaderboards, a story mode, iOS, and anything that
needs a server. Every one of them is a reasonable idea and every one of them would stop
the game shipping.

The single exception under consideration is a **read-only ranking** — a Supabase table of
realm and day count, written once a day, with the save validated server-side before it is
accepted. It changes no mechanic and can be added or removed without touching `sim/`.
