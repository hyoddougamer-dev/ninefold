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

### 瓶頸 The three bottlenecks

Everything in this document was frictionless by policy. §4 says it outright: *"neither
ever says no"*, *"the wall is the curve, not a rule"*. **That policy is now changed on
purpose.** Cultivation fiction is *about* bottlenecks — 瓶頸 is the word for it — and a
xianxia story with no stuck realm is not a xianxia story.

Three of the eight realm transitions stop being purchasable with time:

| gate | at | requires |
|---|---|---|
| **結丹 Forming the Core** | 3 → 4 | kill 灰王 the Grey King, the first warden |
| **化虛 Voiding** | 6 → 7 | dive depth 40, and one 地 Earth-tier piece |
| **渡劫 Tribulation** | 8 → 9 | dive depth 65, six slots at 玄 Mystic or better, and beat 裂天 Skysplitter |

They escalate deliberately: the first is one afternoon, the second is a forge run and a
good dive, the third is months and should be. The other five transitions stay pure qi, so
the game is not one long corridor of locked doors.

> **The cost of this, stated once and plainly.** §3's promise was *"a player who only ever
> opens the app once a day still reaches the ninth realm"*. A player who **never** hunts
> and **never** dives can no longer reach realm 9 — they stall at realm 4 forever. The
> promise survives only in its weaker form: *once a day is still enough*, because one dive
> or one warden clears a gate. Pure absentee play is dead. That is a deliberate trade, made
> knowingly, and it is the second thing in this document to erode that promise — the first
> was letting an active player arrive 26% sooner.

### The cost table

Measured, not chosen. `sim/` builds it and `python3 -m sim.report` reprints it; the test
suite pins every figure below so the document and the model cannot drift apart.

The curve has **two phases**, and the simulator is the reason. A single geometric curve
cannot give both a fast opening and a balanced tail, because the cost grows by `growth`
per realm while the gathering rate grows by only `1.02⁹ = 1.195`. The days in a gap
therefore grow by `growth / 1.195` **every realm, compounding** — which is the mechanical
cause of Finding 1, and it was never written down:

| growth | days-per-gap ratio | the 8→9 gap vs the 1→2 gap | share of the run in the last gap |
|---|---|---|---|
| 1.195 | 1.000 | ×1 | 12% — a flat game |
| 1.45 | 1.213 | ×4 | 22% |
| 1.80 | 1.506 | ×18 | 35% |
| **2.80** | **2.343** | **×388** | **57% — the old build** |

So: `×3.0` through realms 1–3, where the player is learning the game and needs realms
fast, then `×1.25` from realm 4 on, where they are in it and the gaps must stay level.

| realm | cost, in days of base-rate gathering | |
|---|---|---|
| 1 → 2 | 0.78 |  |
| 2 → 3 | 2.34 |  |
| 3 → 4 | 7.02 |  |
| 4 → 5 | 21.06 |  |
| 5 → 6 | 26.32 |  |
| 6 → 7 | 32.91 |  |
| 7 → 8 | 41.13 |  |
| 8 → 9 | 51.42 |  |
| 9 → 9 | 64.27 | the ceiling — no realm 10 |

### The ninth realm has no exit — but it does have a cost

Realm 9 is the ceiling in v1: there is no realm 10 and the tribulation is a state rather
than a gate. It is **not** free. The bible publishes `4.97×` for the layers, and that is
`1.02⁸¹` — all nine realms times nine layers. Reaching realm 9 only opens 72 of them,
which is `4.16×`. The published figure is only true if realm 9's own nine layers can be
opened, and they can: a bar that never *completes* can still fill. So realm 9 carries a
finite cost like any other realm; what it lacks is a far side. That also hands the
end-game player the one thing the old build never had at the ceiling — something still
moving.

---

## 3 · 二道 The two roads

The player is always on one of two roads and may change at any time, free.

**靜 Stillness.** Gathering runs at ×1.00 and runs while the app is closed. This is the
road the game is balanced around: *a player who only ever opens the app once a day still
reaches the ninth realm.*

That promise has been **narrowed twice, both times deliberately** — see §2's bottlenecks
and §4's stance table. What it means now, exactly: *once a day is enough*, and such a
player is never blocked for long. What it no longer means: that a player who never opens
the app at all gets to the top. They stall at the 3→4 bottleneck. Read the promise as a
floor on the **schedule** the game demands, not a floor on the **effort**.

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

### 勢 How a hunt resolves

The bible did not say this for a long time, and everything else was blocked on it.

**The beast telegraphs, you pick a stance, then you strike.** Three stances: 進 press ·
守 guard · 遁 withdraw. Each beast's tell points at one of them — a braced beetle punishes
進, a committed shrike punishes 守. Read it right and the kill pays far more.

| | insight per kill | active player at 8 hunts/day | vs. an idle-only run |
|---|---|---|---|
| **一擊 One Strike** — one roll, no screen | 1, decaying with the haul | day 71 | 1% *slower* |
| **三合 Three Exchanges** — four seconds, watched | 4, partly decaying | day 60 | 14% faster |
| **勢 Stance** ✅ | **8 read right, 3 read wrong, no decay** | **day 52** | **26% faster** |

Measured by `sim/`, against an idle-only run of 70 days. One Strike is rejected on the
evidence: it makes attention worth nothing, which is the opposite of the point.

**Insight does not decay with the day's hunt count, and materials do.** That one asymmetry
is what the whole active/idle balance turns on, and it is why 經脈 channels are the loop
that matters: a kill buys permanent gathering rate, so an active player does not merely
hold more things than an idle one — *they gather faster, forever*.

### 兆 The tells

The obvious design is eighteen beasts each with one right answer, and it is wrong:
eighteen things to memorise, correct forever after day one, and dead as a decision.

So **the tell belongs to the vocabulary, not to the beast.** Nine tells, three per stance.
A player learns nine things once and can then read a beast they have never met — which is
the difference between a skill and a lookup table.

| 兆 | | answer | what you see |
|---|---|---|---|
| **撲** | Lunge | 進 | it drops already committed; a committed beast cannot turn |
| **露** | Open | 進 | its guard hangs wide for a beat |
| **竭** | Spent | 進 | its flanks heave — it has nothing left this exchange |
| **蓄** | Gather | 守 | it draws breath and winds back |
| **盤** | Coil | 守 | it draws in and tightens, all tension |
| **鳴** | Cry | 守 | the call that always comes just before the blow |
| **怒** | Rage | 遁 | its eyes change; the next blow is not one you absorb |
| **召** | Call | 遁 | it is bringing others, and others is not a fight |
| **化** | Shift | 遁 | it becomes something else — whatever you prepared is wrong |

Each beast draws from its own three, and the first is its **signature** — the one it shows
most. That is what lets a player build a read on a specific beast without the read ever
becoming automatic.

| beast | signature | pool |
|---|---|---|
| shrike | **撲** | 撲 · 露 · 鳴 |
| hare | **竭** | 竭 · 撲 · 召 |
| beetle | **盤** | 盤 · 蓄 · 露 |
| crane | **鳴** | 鳴 · 露 · 化 |
| toad | **蓄** | 蓄 · 竭 · 召 |
| serpent | **盤** | 盤 · 撲 · 怒 |
| fox | **化** | 化 · 露 · 召 |
| moth | **竭** | 竭 · 召 · 化 |
| ape | **露** | 露 · 怒 · 蓄 |
| lynx | **撲** | 撲 · 盤 · 竭 |
| tiger | **怒** | 怒 · 撲 · 蓄 |
| boar | **蓄** | 蓄 · 撲 · 竭 |
| roc | **撲** | 撲 · 鳴 · 怒 |
| drake | **化** | 化 · 盤 · 召 |
| turtle | **盤** | 盤 · 蓄 · 竭 |
| qilin | **怒** | 怒 · 化 · 鳴 |
| wraith | **化** | 化 · 召 · 露 |
| hydra | **召** | 召 · 怒 · 盤 |

**Signatures are held at six per stance and no stance is the right answer more than 39% of
the time.** They started at 3 / 7 / 8, and a player meeting mostly 遁-signature beasts
would simply learn that Withdraw is usually right — the exact habit the vocabulary exists
to prevent. `sim/tests` fails if that balance drifts.

### 秘境 The Deep

Eight hunts a day is eight taps. That is thirty seconds. Everything above rewards
**frequency** — checking in six times a day — and nothing rewards **duration**. A dive is
the answer to *"what do I do for two hours?"*.

One qi payment — **four hours of your own rate**, the same as eight hunts — and then a
long free descent. Floor by floor you read a beast and pick a stance. Rewards compound
with depth; the stamina to keep going does not.

**守關 Gate floors, every tenth.** A warden-class encounter that costs nine stamina instead
of the usual one and a half, and pays **five normal floors**. Clearing one **banks
everything so far**. Between gates every point is at risk — so the question stops being
*"should I withdraw?"*, which has a boring correct answer, and becomes *"can I reach floor
40 on twelve stamina?"*

> The first version made gates cost-only and the dive stopped being worth entering: a 70%
> reader fell from floor 50 to 39, and from ×1.99 the materials of the same qi in hunts to
> ×1.39. **A wall that is only a wall just makes people stop.** A gate is a wall *and* a
> prize.

**Stamina grows with the kit** — 100 bare, 160 fully forged. Depth is therefore its own
progression track: the same run goes deeper next month because you built the gear.

| kit | reads right | reaches floor | gates | session | materials vs. the same qi in hunts |
|---|---|---|---|---|---|
| bare | 55% | 34 | 3 | 22 min | ×1.59 |
| bare | 70% | 39 | 3 | 25 min | ×1.84 |
| bare | 85% | 43 | 4 | 27 min | ×2.25 |
| half | 70% | 49 | 4 | 31 min | ×2.58 |
| full | 70% | 59 | 5 | 37 min | ×3.40 |
| full | 85% | **65** | **6** | 41 min | **×4.03** |

**A two-hour session is three dives** and costs about half a day's qi — §4's trade exactly.

| how you play | materials a day | a full 鍊45 kit |
|---|---|---|
| 8 hunts a day — about a minute | 15.3 | 350 days |
| one dive a day — half an hour | 30.5 | 176 days |
| two hours a day, 70% reads | 91.4 | **59 days** |

> **What the dive is sold on, and it is not insight.** The simulator was blunt: with dives
> in, *one dive a day is optimal for realms and more is worse*, because all twelve channels
> are open by week two and further insight is worthless. The dive's long-run value is
> **gear** — the forge is 5 358 units deep and does not saturate for months. Early game a
> dive buys rate; from week three it buys equipment, and that part runs for a year.

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

**器 Gear** — six slots, and *a piece is a track, not a purchase*: you grow one object
for months rather than replacing it. It is the visible reward loop and the sink the 動
Motion road needed. Section 7 is the whole system.

Deliberately: **no gacha, no energy, no timers you pay to skip.** The game is free and
stays free. If it ever earns money it will be from cosmetics that change the 五行 palette
and nothing that touches the curve.

---

## 7 · 鍛 The forge — equipment

The idea everything else hangs from: **a piece is a track, not a purchase.** You never
throw one away. The vessel forged in hour three is the vessel worn in month seven —
raised, refined, inscribed and awakened, still carrying the name of the beetle that
furnished it. Replacing gear is the treadmill every idle game has. Growing one object
for six months is the thing this genre almost never offers.

### Four axes, four currencies

| | axis | range | what it does | fed by |
|---|---|---|---|---|
| **鍊** | refine | 0 → 45 | +2% compounding, one continuous bar | 材 raw materials |
| **階** | ascend | 凡 → 天 | adds **no power** — it raises the 鍊 ceiling | 精 refined + 圖 warden pattern |
| **紋** | inscribe | 0 → 3 | removable 銘 marks, moveable between pieces | 銘 inscriptions |
| **覺** | awaken | 0 → 3 | the trait of the **beast** that furnished it | wearing it — 100 / 500 / 2 000 kills, or a 魂 soul |

**Read the 階 row twice.** Tier adds no power at all — it raises the *ceiling*. That
single change is what makes a piece a track: 鍊 is one continuous bar from 0 to 45, the
tier is only how far along it you may push, and nothing ever resets. *New power is paid
for in the cost table, never by taking the power back out* — and an upgrade that zeroed
your refinement would be exactly that.

Fed, raised, inscribed, worn. Four verbs, four currencies, one object — and every group
in the satchel finally has a job.

### 六位 The six slots

Six copies of "+x% power" would be one stat wearing six hats. Each slot owns a
different **verb**. A freshly forged piece already sits at 41% of its own ceiling
(1 / 2.438), because the first piece in a slot should be the biggest single jump the
player ever feels.

| slot | 漢字 | carries | fresh, 鍊0 | at 鍊45 | why it exists |
|---|---|---|---|---|---|
| **Crown** | 冠 | 悟 insight | +24.6% insight | +60% insight | feeds 經脈 channels and 術 arts — the idle player's slot |
| **Robe** | 袍 | 採 gathering | +4.9% gathering | +12% gathering | the only slot that touches the 靜 Stillness road |
| **Pendant** | 佩 | 質 quality | +7.4pp step-up | +18pp step-up | turns hunting time into material *tier*, not count |
| **Boots** | 靴 | 蹤 trail | — | +2 trail slots, 1 reroll | discrete: +1 slot at 鍊9, +2 at 鍊27, a reroll at 鍊45 |
| **Ring** | 環 | 狩 haul | +36.9% haul | +90% haul | the flat multiplier on everything a hunt returns |
| **Vessel** | 器 | 韌 resilience | K = 7.46 | K = 11.00 | raises K in the decay curve — see below |

**And read the 袍 Robe row twice.** It is the only slot in the game that touches
gathering. A fully maxed kit multiplies the 靜 Stillness road by **×1.12** — under six
九層 layers — and the 動 Motion road by roughly **×2.6** at twenty hunts. Gear is the
sink the active road needed and it cannot quietly become mandatory for the player who
opens the app once a day. *The promise in section 3 survives a fully geared rival.*

> The one leak, stated rather than hidden: materials also buy **經脈 channels**, which
> do multiply gathering. That is the single place where the Motion road buys idle
> power, it is intentional, and it is bounded — twelve channels at a fixed cost.

### 鍊 The bar, and what it costs

Forty-five steps, **+2% compounding each** — the same step as 九層 nine layers, so it is
one rate the player learns once and recognises everywhere. The whole life of a piece is
×2.438.

| tier | 鍊 cap | × | step cost | cumulative | hunts | 昇 refined |
|---|---|---|---|---|---|---|
| 凡 Common | 9 | ×1.195 | 6 | 27 | 9 | 0 |
| 靈 Spirit | 18 | ×1.428 | 13 | 114 | 38 | 2 |
| 玄 Mystic | 27 | ×1.707 | 23 | 279 | 93 | 5 |
| 地 Earth | 36 | ×2.040 | 33 | 535 | 178 | 12 |
| 天 Heaven | 45 | ×2.438 | 45 | 893 | 298 | 25 |

*Raw material of that beast for 鍊; 精 refined material (錠 / 晶 / 髓) for 昇 ascension.*
**地 and 天 ascension additionally need that ground's warden 圖 pattern** — which is
where the wardens nobody reached in the old build become mandatory.

At three units per hunt: **one slot to 鍊9 is nine hunts** — the first piece has to land
on day one. All six slots to 玄 is 558 hunts, about ten weeks at eight a day. All six to
鍊45 is **1 786 hunts, roughly seven months.** Deliberately longer than the previous
draft's four, because this is now the *only* track: you are not also re-forging a piece
per tier.

**鍊 never fails and never takes a piece back down.**

### 源 Where a piece comes from

Three beasts furnish each slot, one per ground, and no ground furnishes the same slot
twice. The **相 phase** of a beast is *independent* of its ground — that is what makes
地套 and 相套 pull the same six slots in different directions.

| slot | furnished by |
|---|---|
| 冠 Crown | 棘伯勞 Thorn Shrike 灰坡 木 · 仙鶴 Immortal Crane 蘆沼 金 · 炎麒麟 Flame Qilin 天裂 火 |
| 袍 Robe | 灰兔 Ash Hare 灰坡 土 · 九尾狐 Nine-Tailed Fox 燼林 火 · 陰魂 Yin Wraith 天裂 水 |
| 佩 Pendant | 月蟾 Moon Toad 蘆沼 木 · 燈蛾 Lantern Moth 燼林 火 · 溺蛟 Drowned Drake 沉宮 水 |
| 靴 Boots | 青蛇 Jade Serpent 蘆沼 木 · 霜猞 Frost Lynx 雷脊 金 · 天鵬 Sky Roc 沉宮 土 |
| 環 Ring | 石猿 Stone Ape 燼林 土 · 雷虎 Thunder Tiger 雷脊 火 · 九頭蟒 Nine-Head Python 天裂 水 |
| 器 Vessel | 鐵甲蟲 Iron Beetle 灰坡 金 · 鐵根彘 Ironroot Boar 雷脊 土 · 玄武龜 Black Stone Turtle 沉宮 水 |

**This is Finding 3 made mechanical.** You cannot finish a kit without visiting every
ground, and the top two tiers gate on wardens. The content nobody reached is what the
end-game is now made of.

### 覺 Awakening — why two identical pieces are not identical

The real answer to progression *per item*. 覺 is unlocked by **wearing** the piece —
100 kills, then 500, then 2 000 — or bought early with a 魂 beast soul. What it grants
belongs to the **beast**, not the slot. So two robes at the same tier and the same 鍊 do
not play the same, because one is a hare and one is a fox. 覺2 repeats the trait at half
strength; 覺3 opens a third 紋 slot.

| slot | beast | trait | 相 | what it does |
|---|---|---|---|---|
| 冠 | 棘伯勞 Thorn Shrike | **刺 Thorn** | 木 | +12% haul when the trail beast is below your realm |
| 冠 | 仙鶴 Immortal Crane | **潔 Purity** | 金 | −10% qi cost on every hunt |
| 冠 | 炎麒麟 Flame Qilin | **瑞 Auspice** | 火 | +20% chance a 銘 inscription drops |
| 袍 | 灰兔 Ash Hare | **疾 Haste** | 土 | the trail's countdown runs 15% faster |
| 袍 | 九尾狐 Nine-Tailed Fox | **幻 Illusion** | 火 | the first decline of a window is free |
| 袍 | 陰魂 Yin Wraith | **怨 Grudge** | 水 | +30% haul from wardens |
| 佩 | 月蟾 Moon Toad | **納 Absorb** | 木 | +20% yield of 精 refined materials |
| 佩 | 燈蛾 Lantern Moth | **引 Lure** | 火 | +1 beast on the trail |
| 佩 | 溺蛟 Drowned Drake | **溺 Drown** | 水 | materials from 沉宮 come one tier higher |
| 靴 | 青蛇 Jade Serpent | **蛻 Shed** | 木 | re-roll one material stack per hunt |
| 靴 | 霜猞 Frost Lynx | **霜 Frost** | 金 | the haul decays 10% slower — K ×1.1 |
| 靴 | 天鵬 Sky Roc | **翔 Soar** | 土 | may hunt one ground above your realm without penalty |
| 環 | 石猿 Stone Ape | **力 Strength** | 土 | +15% haul, flat |
| 環 | 雷虎 Thunder Tiger | **威 Dominion** | 火 | +25% insight from kills |
| 環 | 九頭蟒 Nine-Head Python | **眾 Legion** | 水 | every 9th hunt of a day returns twice |
| 器 | 鐵甲蟲 Iron Beetle | **堅 Endure** | 金 | banked hunts cap raised by 2 |
| 器 | 鐵根彘 Ironroot Boar | **根 Root** | 土 | +20% haul when you have not hunted in the last 6 h |
| 器 | 玄武龜 Black Stone Turtle | **壽 Longevity** | 水 | wardens drop 魂 beast souls 50% more often |

### 套 Three families of set, one kit

Six slots, three families of different **size**, so which sets you run at once is a real
build decision rather than a checklist.

**地套 Ground sets** — three pieces from one ground. Six of them.

| ground | | set | grants |
|---|---|---|---|
| 灰坡 | Ash Slopes | **積 Hoard** | +20% yield of 凡 and 靈 materials |
| 蘆沼 | Reed Marsh | **候 Watch** | the trail rotates every 4 h instead of 6 |
| 燼林 | Cinder Wood | **悟 Insight** | +30% insight from kills |
| 雷脊 | Thunder Ridge | **猛 Fury** | +25% haul |
| 沉宮 | Sunken Palace | **精 Refine** | +12pp material step-up chance |
| 天裂 | The Scar | **恆 Endure** | K +2 |

**相套 Phase sets** — three pieces sharing a 五行 phase. Five of them.

| 相 | | set | grants | availability |
|---|---|---|---|---|
| 木 | Wood | **生 Growth** | every hunt returns 8% of its own qi cost | crown · pendant · boots — the only three that exist, so it is exact |
| 火 | Fire | **炎 Blaze** | +40% haul on the day's first three hunts, −10% after | four slots to choose three from |
| 土 | Earth | **厚 Bedrock** | no decay at all for the first six hunts of a day | four slots to choose three from |
| 金 | Metal | **銳 Edge** | +50% chance of a 天 material, −15% material count | crown · boots · vessel — exact, and the hardest to assemble |
| 水 | Water | **流 Flow** | unspent hunts bank, up to 5, and a banked hunt ignores decay | four slots to choose three from |

木 Wood and 金 Metal are **exact**: only three beasts carry each phase, so there is
exactly one legal combination and it spans three different grounds. 火, 土 and 水 each
have four candidates, so you choose which three. The exact sets get the sharper bonuses
— they are harder to assemble and they should pay for it.

**道套 Path sets** — all six pieces, and they change a rule. Three of them.

| 印 | | set | grants |
|---|---|---|---|
| 劍 | Sword | **平 Level** | K is multiplied by 1.5, on top of the vessel |
| 刀 | Blade | **爆 Burst** | the first hunt of each 6 h window returns ×3 |
| 弓 | Bow | **遠 Reach** | hunt any ground, opened or not, at half the usual penalty |

A path set needs every piece stamped with the same 印 path seal, forged from the 印 seal
fragments already in the bag. Any piece can take any seal, so a path set is reachable
from any origin — it is simply expensive, late, and it eats the whole kit.

**The four shapes of build this produces:** `3+3` two small sets (the default a player
finds by accident) · `3+3 exact` 木 and 金 together, six specific beasts across five
grounds (the collector's build) · `6` one path set, biggest single effect in the game
and it costs every other set · `3 + free` one set and three pieces chosen purely for
their 覺 traits, often the strongest before month three.

### 韌 The one number worth arguing about

The 器 Vessel does not multiply the haul. It raises **K** in the decay curve
`h(n) = 1 / (1 + (n−1)/K)`, so it is worth almost nothing on hunt one and a great deal
on hunt forty — the marathon slot, which is exactly the reward uncapped hunting was
missing. The 劍 Sword path set multiplies K again.

| vessel | | 4 hunts | 8 | 20 | 50 |
|---|---|---|---|---|---|
| none | K = 5.0 | ×1.00 | ×1.61 | ×2.67 | ×3.93 |
| 凡, just forged 鍊0 | K = 7.5 | ×1.07 | ×1.80 | ×3.18 | ×4.94 |
| 玄 鍊27 | K = 9.2 | ×1.10 | ×1.89 | ×3.46 | ×5.53 |
| 天 鍊45 | K = 11.0 | ×1.12 | ×1.96 | ×3.70 | ×6.07 |
| 天 鍊45 + 劍套 | K = 16.5 | ×1.16 | ×2.11 | ×4.22 | ×7.37 |

*Haul vs. four bare hunts — the same reference row as section 4.* Note what does **not**
happen: the four-hunt player still gains, so the vessel is never dead weight; and the
fifty-hunt player reaches ×7.4 while still spending more than a day of qi to get there.
The brake stays a curve, not a rule.

### The four item kinds this needs

| | | source | what it is |
|---|---|---|---|
| **圖** | Pattern | warden drop, once | unlocks 地 and 天 ascension for that piece |
| **銘** | Inscription | beast drop | a 紋 mark as an object — slot it in, pull it out, move it |
| **印** | Path seal | forged from 印 seal fragments | stamps a piece 劍 / 刀 / 弓 for the 道套 path set |
| **魂** | Beast soul | warden drop | buys a 覺 awakening instead of waiting for the kill count |

Three are new. The fourth, 印, is already in the bag as seal fragments and finally has a
use. 精 refined materials — which had no job before — are now the ascension currency.

### 初 What this generates, counted honestly

| | |
|---|---|
| 圖 patterns, one per beast | 18 |
| 昇 ascensions, 6 slots × 4 | 24 |
| 覺 awakenings, one trait per beast | 18 |
| 銘 inscriptions, first found | 8 |
| 套 sets first completed — 6 ground, 5 phase, 3 path | 14 |
| **total** | **82** |

**A correction to the previous draft,** which claimed 116 by counting 54 refinement
steps as novelty. They are not — a refinement step is progress the player already knows
is coming. Counting only things never seen before, the honest figure is **82**, and the
270 refinement steps sit underneath them as the reason to keep hunting between the 82.

### Open, and deliberately not decided here

- **Can 鍊 fail?** Recommendation: no — doubly so now that 鍊 is the piece's whole life.
  Middle option if tension is wanted: a failure wastes the materials, never the piece.
- **Are 銘 inscriptions removable?** Recommendation: yes, freely. A mark you can move is
  a reason to keep hunting for a better one; a mark welded in place is a reason to fear
  equipping anything.
- **Can 覺 be bought outright?** Recommendation: only with 魂 beast souls, which only
  wardens drop. Purely time-gated punishes new players; purely purchasable makes wearing
  the piece meaningless.
- **Can gear be sold or traded?** Recommendation: neither, in v1. The moment gear has a
  price the hunting curve becomes an income curve — and a piece you grew for seven
  months should not have a price.
- **Three units of material per hunt was wrong, and is now measured.** The simulator
  checked it first, as this line used to demand. The real figure depends on how hard the
  player plays, because `h(n)` decay is *inside* the average and the cost table forgot it:

  | hunts/day | units per hunt | vs. the assumed 3.00 |
  |---|---|---|
  | 2 | 2.72 | 91% |
  | 4 | 2.34 | 78% |
  | 8 | **1.90** | **63%** |
  | 16 | 1.41 | 47% |
  | 30 | 1.01 | 34% |

  So **every hunt figure in the table above is optimistic by about 59%** at eight hunts a
  day. Three ways out, and this one is not mine to pick: raise the base yield so the
  *average* lands on 3.00; cut the forge costs by a third; or accept a slower forge and
  say so. Until it is chosen, read the 鍊45 column as roughly 470 hunts per slot, not 298.

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
| **Forge keys** | 匠 | what only the forge takes: 圖 pattern · 銘 inscription · 印 path seal · 魂 beast soul — all four in section 7 |
| **Gear** | 法器 | the six slots of section 7: 冠 · 袍 · 佩 · 靴 · 環 · 器 |

---

## 10 · Art

The full system is `docs/ART.md`. In one paragraph: nothing is illustrated. A realm is a
contour figure plus a halo count; a beast is a 饕餮 mask plus a frame; an item is a mark
plus a rarity tile. Everything is generated from rules, in one palette, on one lacquer
ground — so the library cannot drift, which is what destroyed the previous one.

**Every piece of gear is its own icon — eighteen, not six.** A slot is a *mount*: a band,
a collar, a cord, a cuff, a hoop, a lid, minimal and readable by silhouette alone. The
beast's **motif** is the body of the thing. The eighteen materials use the same motifs with
no mount, on a plinth. Four readings come off one tile without competing: **tier** from the
frame, **相 phase** from the colour, **slot** from the mount, **源 origin** from the motif.

**鍊 shows as an aura, in nine bands.** The bar runs 0→45 and the aura steps every five, so
`band = ⌈鍊/5⌉`, 0 to 9 — the same nine as 九重 the realms and 九層 the layers, using the
same escalating vocabulary as the cultivator's realm aura: glow, halo, motes, rays, turning
ring, orbiting nodes, column, spokes, 九雷 nine bolts. Bands are cumulative. The **+N** plate
is the number the player says out loud, so it is legible before it is pretty.

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

### 存 The save, and the only code allowed to read a clock

**There is no "offline mode".** There is one operation — *advance the simulation by N
seconds* — and closing the app for fourteen hours is the same call as leaving it open for
fourteen hours. Online and offline cannot drift apart because they are not two code paths.

That is tested, not asserted: advancing sixty days in one step and in two thousand steps
agree to within 10⁻⁶ of a qi. §13 listed this as settled for a long time without anybody
having run it.

**The blob.** Short keys, written on every pause, signed so a hand edit does not verify:

```
{ "v":1, "t":<wall clock at save>, "e":<seconds ever credited, only grows>,
  "r":<realm>, "l":<layer>, "q":<qi>,
  "ch":{"o":<channels open>,"i":<insight>},
  "d":{"n":<day>,"h":<hunts today>,"best":<deepest dive>},
  "sig":"<blake2b>" }
```

**What the clock is allowed to conclude**, and each case is a choice rather than an
accident:

| the clock moved | the game | why |
|---|---|---|
| forwards, plausibly | credits it, **uncapped** | §3 promises gathering runs while the app is closed. A cap would punish exactly the player the game is balanced around. Come back after a month and a month is what you get. |
| backwards | credits **nothing**, moves the reference forward | Never punish — a phone that crossed a timezone or fixed its NTP drift is not a cheat. Never pay for it either. |
| forwards, absurdly (>90 days) | credits it, and **flags** it | Refusing locally breaks honest players with a wrong clock and does not stop a dishonest one. The flag is what a server checks later. |

**This does not stop a determined cheat, and it is not pretending to.** Without a server
there is no trustworthy clock, and security that looks like it works is the worst kind.
What the format does is keep enough history that a server can validate it later, and stay
shaped so that adding one needs no migration.

### 初 The first five minutes

The simulator found this one: realm 1 costs 0.78 days, so **one layer is 2.1 hours**. A
brand new player waits two hours for the first thing that ever happens to them. That is an
onboarding failure and it was invisible until the curve existed.

Three fixes, together:

1. **初賜 an opening gift** of five layers' worth of qi. It does not move the 70-day curve
   at all — five layers of realm 1 against a 70-day run is nothing — and it means minute
   one is not empty.
2. **Layers open automatically but are *presented* one at a time.** They must open by
   themselves or the once-a-day player loses the compounding (§13). Banking the openings
   and playing them back on the next launch gives both: nothing is lost while away, and
   returning is a sequence of things happening rather than one number being different.
3. **The first three hunts cost no qi.** The first has its tell answered for you, the
   second shows the tell and lets you choose, the third explains nothing.

What a first session then delivers: five layer openings, three kills, the first materials,
the first forge, the first piece of gear, and the first stance read — **nine first-times in
five minutes**, against Finding 2's 57.6 in week one.


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

**Measured and settled** — by `sim/`, and pinned by `sim/tests/test_rules.py`:

- the haul decay curve and its advantage figures: ×1.00 / ×1.61 / ×2.67 / ×3.93
- the layer multiplier reaching 4.97×, *once realm 9's own layers are openable* (§2)
- offline progress paying identically in one step or many
- **the realm cost table**, and the two-phase shape it needs
- **realm 9's cost**, which was the first blocking item: an idle-only run now finishes in
  **70 days with 20% in its worst gap**, against the old build's 56 days with 71%
- **layers open by themselves** as qi crosses the threshold, online or closed. If a layer
  needed a tap, the once-a-day player would bank qi unspent, lose the compounding, and
  §3's promise would be false by construction.
- **hunting never accelerates the climb.** Obvious, and the model got it backwards at
  first — a time-accounting slip handed hunting players 78% of a bonus day, so the table
  read as though hunting were free realms. It is a regression test now.

**Open, and blocking:**

- **`K = 5`** is now *testable* rather than untestable — `sim/report.py` prints the
  advantage figures on every run, so a change to it is never silent. What it still lacks
  is a criterion: nobody has said what advantage an active player *should* have.
- **The bow's curve.** Still open, and now for a specific reason: the bow's difference is
  ground *access*, not haul, and grounds have no value model yet. It cannot be simulated
  until 鬥 below exists.
- ~~Beast tells~~ — **done**, §4 兆. Nine tells, not eighteen; balanced 6/6/6 and pinned.
- **What a 守關 gate floor actually is.** It costs nine stamina and pays five floors, and
  that is all the model knows. Whether it is a warden, a puzzle or a harder read is open.
- **Whether a failed 瓶頸 costs anything.** Right now a bottleneck simply waits. If failing
  the 渡劫 tribulation should cost something, it has not been designed, and the rule *new
  power is paid for in the cost table* makes that a narrow needle to thread.

**Open, not blocking:** how many channels; whether wardens respawn; the five gear
questions at the end of section 7 — whether 鍊 can fail, whether 銘 marks are removable,
whether 覺 can be bought, whether gear can be traded, and the assumed **three units of
material per hunt** that the entire forge cost table rests on.

---

## 14 · Not in v1

Multiplayer, sects, PvP, trading, leaderboards, a story mode, iOS, and anything that
needs a server. Every one of them is a reasonable idea and every one of them would stop
the game shipping.

The single exception under consideration is a **read-only ranking** — a Supabase table of
realm and day count, written once a day, with the save validated server-side before it is
accepted. It changes no mechanic and can be added or removed without touching `sim/`.
