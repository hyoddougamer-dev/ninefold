# 九境 Ninefold — concept

An idle cultivation game for phones, on the web and as an APK. Portrait, one hand.

> **In one line.** Qi rises on its own, nine realms above you, and every realm ends in a
> beast that has to fall before you break through.

This is what was **agreed**, not what was proposed. Anything still open is marked as such.

---

## 1 · The loop

Four steps, and there is no fifth.

| | | |
|---|---|---|
| **1 · Gather** | Qi rises on its own, app open or closed | You do not have to be there |
| **2 · Spend** | On technique, method, pills and beast cores | All multiply. Nothing is ever lost |
| **3 · Fight** | The realm's bar fills, the warden appears | Lost? Gather more and come back |
| **4 · Break through** | The aura changes, the colour changes, the rate multiplies | A visible event, not a bigger number |

An idle game is played **closed**: the app sits in the background twenty-three hours a
day. So progress is computed from timestamps and never from frames.

---

## 2 · The nine realms

Each realm has nine layers, and each opened layer adds **+2% to the rate, compounding** —
reaching **4.97x** at the top.

A layer is not a second currency. It is a reading of the bar: the realm's cost divided by
nine. It exists for one reason — a realm that takes thirty days gives the player one event
in thirty days; the same realm in nine layers gives them nine.

| # | 漢字 | Name | Aura that arrives | Warden |
|---|---|---|---|---|
| 1 | 練氣 | Qi Refining | nothing yet — only the breath | 妖狐 Spirit Fox |
| 2 | 築基 | Foundation | the first glow, faint and steady | 石猿 Stone Ape |
| 3 | 金丹 | Golden Core | 圓光 the halo — the first sign read from across a room | 仙鶴 Immortal Crane |
| 4 | 元嬰 | Nascent Soul | 塵 motes of qi loose in the air | 雷虎 Thunder Tiger |
| 5 | 化神 | Spirit Severing | the aura takes on a body behind you | 玄武 Black Turtle |
| 6 | 煉虛 | Void Refining | 芒 spokes radiating from the seat | 石傀 Stone Puppet |
| 7 | 合體 | Unity | a second halo, and blades of qi circling | 魔狼 Demon Wolf |
| 8 | 大乘 | Great Vehicle | the energy begins to turn on its own | 蛟 Serpent Dragon |
| 9 | 渡劫 | Tribulation | 九雷 the nine bolts | 龍 Dragon |

**The ninth realm is the ceiling of v1.** No rebirth. Its cost is `INF` and its bar never
completes.

---

## 3 · The beasts

**Automatic combat, watched.** It resolves over a few seconds — health bars falling — and
the player watches without playing. It is the only moment that is not a bar filling, and
it is what gives technique, pills and gear a reason to exist. Losing does not punish.

**Free hunting exists.** Thirty-six beasts: three commons and one warden per realm. Beast
power is not a curve of its own; it is tuned against the reference player, so the balance
follows on its own when the cost table changes. Measured:

```
warden — spending nothing 2% · spending 35% of earned qi ~33% · spending 55% ~80%
realm 5, the three commons: 巨蟹 97% · 水母 82% · 岩蜥 52%
```

> **Open:** whether hunting costs qi, and whether material stays one currency.

---

## 4 · The curve

**Agreed target: three months to the ninth realm, opening the app once a day.** Measured,
and printed by `src/sim/__tests__/curve.test.ts` on every run:

```
once a day, no multipliers — 90.0 days to the ninth realm

  練氣 realm 1  day  0.0      煉虛 realm 6  day 23.0  (+10.0d · 11%)
  築基 realm 2  day  1.1      合體 realm 7  day 38.0  (+15.0d · 17%)
  金丹 realm 3  day  3.1      大乘 realm 8  day 59.6  (+21.7d · 24%)
  元嬰 realm 4  day  6.8      渡劫 realm 9  day 90.0  (+30.3d · 34%)
  化神 realm 5  day 13.0

largest gap: 30.3d = 33.7% of the run (ceiling 35%)
in the last realm a layer opens every 3.4 days
```

The realm-to-realm ratio **shrinks** toward the top (1.9 down to 1.4). A constant ratio
always leaves ~41% of a playthrough in the last gap however large the curve is. At three
months, 41% would be **37 days with nothing new** — exactly how the earlier version died.

**The risk that remains, said out loud:** thirty days in the ninth realm with no rebirth
after it. This is where the game will hurt first.

---

## 5 · Art

Chosen direction: **霓 neon night** — deep indigo, cyan and magenta with glow.

Drawings come from [game-icons.net](https://game-icons.net/): 4,239 vector icons under
**CC BY 3.0**, commercial use allowed. Every icon is a white silhouette on a black square;
strip the square and it takes any colour — which is why nine realms did not cost nine
drawings.

**The cultivator** is one figure, the same in every realm. What changes is the air around
it. Three rules the first attempts broke, now law:

1. **The halo is drawn, not an icon.** As an icon it read as a cog behind the head.
2. **The figure burns toward white as it climbs.** Without that the aura swallowed the
   cultivator from the seventh realm on, inverting the whole point of the image.
3. **The aura is masked by a radial gradient.** Scaled to 2x it hits the viewBox edge, and
   unmasked it shows as hard cropped blocks instead of glow.

A realm has to be readable **from the aura alone**, without reading a word.

**What free libraries do not cover:** illustrated anime character portraits. That is the
one part that gets bought or commissioned.

**Required credit:** CC BY 3.0 asks for the icon authors on a credits screen.

---

## 6 · Technical

One codebase for web and APK: **TypeScript + Vite**, wrapped with **Capacitor** for
Android.

Four rules, and the earlier version broke the first three at least once each:

1. **`sim/` is pure.** Everything is a function from `(state, instant)` to a new state —
   which is what lets the same code run the game, the tests and a ninety-day simulation.
2. **Time is a timestamp, never a frame.** One long absence pays exactly what many short
   ones pay. There is a test.
3. **A save is input**, validated like any other. The earlier version shipped without this
   and had a hole where a hand-edited item multiplied the rate by 196,502x.
4. **Balance numbers live in one table**, printed on every test run, so changing one is
   never silent.

**Language:** the game and the code are in English. The one exception is
`tools/overview.ts`, whose copy is written for Bruno in European Portuguese.

---

## 7 · Not in v1

Multiplayer, sects, PvP, trading, leaderboards, rebirth, iOS, and anything needing a
server.
