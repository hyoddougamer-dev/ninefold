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

**器 Gear** — forged from beast materials, six slots, five tiers, nine refinements. It is
the visible reward loop and the sink the 動 Motion road needed. Section 7 is the whole
system.

Deliberately: **no gacha, no energy, no timers you pay to skip.** The game is free and
stays free. If it ever earns money it will be from cosmetics that change the 五行 palette
and nothing that touches the curve.

---

## 7 · 鍛 The forge — equipment

A piece of gear is **three numbers and a name**:

| | | decides |
|---|---|---|
| **源 origin** | which beast furnished it | the **slot**, and which ground you must go to |
| **階 tier** | 五階, 凡 → 天 | the **ceiling** |
| **鍊 refinement** | 0 → 9 | how far up that ceiling you are |

Nothing else. No affix soup, no rolled stat lines, no item level. A player reads a piece
the way they read a beast: a shape plus a rank.

### 六位 The six slots

Six copies of "+x% power" would be one stat wearing six hats. Each slot owns a different
**verb**, so choosing between two pieces is a real question and the six together read as a
kit rather than a score.

| slot | 漢字 | carries | at 天 Heaven 鍊9 | why it exists |
|---|---|---|---|---|
| **Crown** | 冠 | 悟 insight | +60% insight from kills | feeds 經脈 channels and 術 arts — the idle player's slot |
| **Robe** | 袍 | 採 gathering | +12% gathering | the only slot that touches the 靜 Stillness road |
| **Pendant** | 佩 | 質 quality | +18pp chance a material comes up one tier | turns hunting time into material *tier*, not count |
| **Boots** | 靴 | 蹤 trail | +2 trail slots, 1 free reroll per window | attention buys quality; boots buy more of it |
| **Ring** | 環 | 狩 haul | +90% haul | the flat multiplier on everything a hunt returns |
| **Vessel** | 器 | 韌 resilience | K: 5 → 11 | the marathon slot — see below |

**Read the 袍 Robe row twice.** It is the only slot in the game that touches gathering and
it is deliberately the smallest number in the document. Full Heaven gear multiplies the
靜 Stillness road by **×1.14** — about seven 九層 layers — and the 動 Motion road by
roughly **×3.2**. That asymmetry is the whole design: gear is the sink the active road
needed, and it cannot quietly become mandatory for the player who opens the app once a
day. *The promise in section 3 survives a fully geared rival.*

> The one leak, stated rather than hidden: materials also buy **經脈 channels**, which do
> multiply gathering. That is the single place where the Motion road buys idle power, it
> is intentional, and it is bounded — twelve channels at a fixed cost, not a curve.

### 源 Where a piece comes from

Three beasts furnish each slot, one per ground, and no ground furnishes the same slot
twice.

| slot | furnished by |
|---|---|
| 冠 Crown | 棘伯勞 shrike 灰坡 · 仙鶴 crane 蘆沼 · 炎麒麟 qilin 天裂 |
| 袍 Robe | 灰兔 hare 灰坡 · 九尾狐 fox 燼林 · 陰魂 wraith 天裂 |
| 佩 Pendant | 月蟾 toad 蘆沼 · 燈蛾 moth 燼林 · 溺蛟 drake 沉宮 |
| 靴 Boots | 青蛇 serpent 蘆沼 · 霜猞 lynx 雷脊 · 天鵬 roc 沉宮 |
| 環 Ring | 石猿 ape 燼林 · 雷虎 tiger 雷脊 · 九頭蟒 hydra 天裂 |
| 器 Vessel | 鐵甲蟲 beetle 灰坡 · 鐵根彘 boar 雷脊 · 玄武龜 turtle 沉宮 |

**This is Finding 3 made mechanical.** You cannot finish a kit without visiting every
ground, and the **地 Earth and 天 Heaven patterns drop only from that ground's warden**.
The content nobody reached in the old build is the content the end-game is now made of.

**套 Set.** Three pieces from one ground grant that ground's 五行 phase bonus — a reason
to finish a ground rather than skim the best piece off each.

### How a piece is acquired — the fork

| | how | fails at |
|---|---|---|
| **A · pure craft** | beasts drop materials; the forge makes the piece | perfectly predictable and perfectly surprise-free; every bag is identical |
| **B · pure drop** | beasts drop finished pieces with rolled tier | highest excitement, and a dry week is indistinguishable from no content — the old build's failure |
| **C · pattern + forge** ✅ | the beast drops its **圖 pattern** the first time, *guaranteed by kill count, not by chance*; materials drop forever; the piece is then forged deterministically | nothing yet — this is the recommendation |

Under C, luck decides *when* you unlock, never *whether*. Eighteen guaranteed first-time
moments, and the forge still answers to the cost table.

### 階 and 鍊 — the cost table

Tier is **not luck**: it is decided by the material you put in. A dry streak costs you
time and never costs you a tier.

鍊 refinement is nine steps per piece at **+2% compounding each** — the same step as 九層
nine layers, so it is one number the player learns once and recognises everywhere. 鍊9 is
×1.195.

| tier | forge | 鍊1 | 鍊9 | piece total | hunts, at 3 units/hunt |
|---|---|---|---|---|---|
| 凡 Common | 6 | 2 | 11 | 64 | 21 |
| 靈 Spirit | 10 | 2 | 18 | 100 | 33 |
| 玄 Mystic | 18 | 4 | 33 | 184 | 61 |
| 地 Earth | 30 | 6 | 54 | 300 | 100 |
| 天 Heaven | 50 | 10 | 90 | 500 | 167 |

*Units of that beast's material, at that tier.* Forging and refining are paid in the
**same** material, so a player who over-farms one beast is never stuck holding the wrong
currency.

A full **玄 Mystic** kit is 368 hunts — about six weeks at eight hunts a day. A full
**天 Heaven** kit is 1 000 hunts, about four months. That is the shape an end-game wants:
reachable, and not this month.

**鍊 never fails and never takes a piece back down.** *New power is paid for in the cost
table, never by taking the power back out* — that rule applies to refinement too, which
is why the genre-standard "refining can shatter your sword" is not here.

### 韌 The one number worth arguing about

The 器 Vessel does not multiply the haul. It raises **K**, the constant in the hunting
decay curve `h(n) = 1 / (1 + (n−1)/K)`. So it is worth almost nothing on hunt one and a
great deal on hunt forty — a marathon slot, which is exactly the reward uncapped hunting
was missing.

| vessel | | 4 hunts | 8 | 20 | 50 |
|---|---|---|---|---|---|
| none | K = 5.0 | ×1.00 | ×1.61 | ×2.67 | ×3.93 |
| 靈 Spirit | K = 6.2 | ×1.04 | ×1.71 | ×2.94 | ×4.45 |
| 地 Earth | K = 8.0 | ×1.08 | ×1.83 | ×3.27 | ×5.13 |
| 天 Heaven 鍊9 | K = 11.0 | ×1.12 | ×1.96 | ×3.70 | ×6.07 |

*Haul vs. four bare hunts — the same reference row as section 4.*

Note what does **not** happen: the four-hunt player still gains (×1.12), so the vessel is
never dead weight; and the fifty-hunt player goes from ×3.93 to ×6.07 while still spending
more than a day of qi to get there. The brake stays a curve, not a rule.

### 紋 Eight marks, at 地 and 天 only

One rolled property, at the top two tiers only, from a fixed pool of eight. Variety is
allowed in late, small, and readable in a single line. Rerolling costs 幣 sect coin, which
gives that currency the second use it currently lacks.

| | | |
|---|---|---|
| 貪 | Gluttony | every 5th hunt of a day ignores the decay entirely |
| 眠 | Slumber | the first hunt after 8 h closed returns double |
| 燼 | Ember | +25% haul on the ground this piece came from |
| 鏡 | Mirror | a declined trail does not spend the window |
| 骨 | Bone | materials from wardens come one tier higher |
| 風 | Wind | trail rotates every 4 h instead of 6 |
| 鎖 | Lock | banks one unused hunt per day, up to 3 |
| 雷 | Thunder | +40% insight, but −20% haul |

### 初 What this generates

Finding 2 was that novelty collapses from 57.6 first-time events in the opening hour to
roughly one a week. This system generates **116 distinct first-time events**:

| | |
|---|---|
| 18 patterns, one per beast | 18 |
| 6 slots × 5 tiers, first forge | 30 |
| 6 slots × 9 refinements | 54 |
| 6 grounds, set completed | 6 |
| 8 marks, first seen | 8 |
| **total** | **116** |

Spread across the months the 8→9 gap actually lasts.

### Open, and deliberately not decided here

- **Can 鍊 fail?** Recommendation: no. Middle option if tension is wanted: a failure
  wastes the materials and never touches the piece.
- **Does 鍊 carry across tiers?** Recommendation: yes — 移 transfer half your refinement
  level when you forge the same slot one tier up, so an upgrade never feels like a
  demotion.
- **Can gear be sold or traded?** Recommendation: neither, in v1. The moment gear has a
  price, the hunting curve becomes an income curve and every number above has to be
  re-derived against a market.
- **Three units of material per hunt** is an assumption, not a measurement. Every number
  in the cost table rests on it, and it is the first thing a real simulator must check.

---

## 8 · 地 The grounds and 獸 the beasts

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

## 9 · Currencies

| | 漢字 | earned by | spent on |
|---|---|---|---|
| **qi** | 氣 | time | realms, hunts |
| **insight** | 悟 | killing beasts | channels, arts |
| **materials** | — | hunts | gear, pills |
| **sect coin** | 幣 | humanoids, dailies | trail rerolls, and 紋 mark rerolls |

Five material tiers, the 五階 ladder: 凡 Common · 靈 Spirit · 玄 Mystic · 地 Earth ·
天 Heaven. The tier is carried by the item's **frame**, so a player reads rarity across a
grid without reading a word.

### What is in the bag

Five kinds, and each has exactly one reason to exist. **No weapons.** A path — 劍 sword,
刀 blade, 弓 bow — is who you are, not something you carry in a satchel beside a fang, so
weapons live on the cultivator and never in the inventory.

| | 漢字 | what it is |
|---|---|---|
| **Materials** | 材 | what a beast leaves behind: 牙 fang · 角 horn · 皮 hide · 鱗 scale · 骨 bone · 絲 silk · 羽 plume · 核 demon core |
| **Refined** | 精 | what the cauldron turns them into: 錠 ingot · 晶 crystal · 髓 marrow · 靈石 spirit stone |
| **Consumables** | 用 | what is spent: 丹 pill · 草 herb · 露 dew · 葫 gourd |
| **Quest items** | 契 | what a task is made of: 玉 token · 印 seal fragment · 圖 map fragment · 卷 art scroll · 符 talisman · 幣 sect coin |
| **Gear** | 法器 | the six slots of section 7: 冠 · 袍 · 佩 · 靴 · 環 · 器 |

---

## 10 · Art

The full system is `docs/ART.md`. In one paragraph: nothing is illustrated. A realm is a
contour figure plus a halo count; a beast is a 饕餮 mask plus a frame; an item is a flat
mark plus a rarity tile. Everything is generated from rules, in one palette, on one
lacquer ground — so the library cannot drift, which is what destroyed the previous one.

**What the art must carry, in order of importance:** the realm you are in, the rank of
what you are looking at, and whether something happened. Beauty is third. An idle game is
read a hundred times a day and admired twice.

---

## 11 · Screens

Four, reachable by one bottom bar. No menus more than two deep.

**今 Now** — the home. The realm in 漢字, the qi ring with the cultivator inside it, the
two roads as cards, the current trail with one beast on it, the satchel row.

**道 Path** — channels, arts, the path choice. Where banked insight is spent.

**獵 Hunt** — the six grounds, what stands on each, the countdown to the next trail.

**藏 Satchel** — the bag in its five groups, the 鍛 forge, and the bestiary of what has
been killed. The forge lives here rather than on its own tab: a material and the thing it
becomes belong on one screen.

The bestiary is doing double duty: it is the collection screen *and* the answer to
Finding 2, because a seal that fills in is a first-time event that costs nothing to
produce.

---

## 12 · Technical

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

## 13 · What is measured, and what is open

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

**Open, not blocking:** how many channels; whether wardens respawn; the four gear
questions at the end of section 7 — whether 鍊 can fail, whether it carries across tiers,
whether gear can be traded, and the assumed **three units of material per hunt** that the
entire forge cost table rests on.

---

## 14 · Not in v1

Multiplayer, sects, PvP, trading, leaderboards, a story mode, iOS, and anything that
needs a server. Every one of them is a reasonable idea and every one of them would stop
the game shipping.

The single exception under consideration is a **read-only ranking** — a Supabase table of
realm and day count, written once a day, with the save validated server-side before it is
accepted. It changes no mechanic and can be added or removed without touching `sim/`.
