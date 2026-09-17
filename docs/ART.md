# 藝 Art — the system

Nothing in this game is illustrated. Every mark is geometry and type, generated from
rules, in one palette, on one lacquer ground.

That is not a style preference. Nine separate attempts at drawn figures were made and
rejected — as lit 3D, as stylised figurines, as ink-line portraits, as hard-surface
panels, as vector silhouettes standing and seated. Every rejection was for the same
reason: the **contour**. A technique with no contour cannot lose on one, and geometry has
not failed once.

## The rule everything obeys

> **A thing is a shape plus a rank.**

A realm is a contour figure plus a halo count. A beast is a mask plus a frame. An item is
an object plus a tile. Nothing needs its own pipeline and nothing can drift apart,
because none of it is drawn.

## 修士 The cultivator — 線 contour

The seated body is described by horizontal bars and has **no outline at all**. The body
barely changes across the nine realms, deliberately: a cultivator is still a person at the
ninth. Everything that says *this one is further along* happens in the air around them,
and it arrives in fixed steps so a player reads their own rank across a room.

| realm | what arrives |
|---|---|
| 3 | 圓光 the halo |
| 4 | 塵 motes drifting in the field |
| 5 | 蓮 the lotus seat |
| 6 | 環 an orbit ring with nodes on it |
| 7 | a second halo, 柱 a column of light |
| 8 | 芒 spokes radiating from the seat |
| 9 | 九雷 nine bolts of tribulation, and the vortex they come from |

## 獸 The beasts — 饕餮 masks in 印 seals

Frontal, rigidly symmetric, assembled from one vocabulary: horns, ears, brow, eyes,
snout, mouth, fangs, tongue, tusks, whiskers, antennae, ruff, hood, markings, body. Each
creature is a row in a table, which is why eighteen of them are distinct from each other
and obviously one family.

A mask is a **designed object**, not a portrait, so there is no anatomy to get wrong; and
because both halves are one shape mirrored, an uncontrolled outline cannot happen.

Rank shows inside the frame — a rank-1 beast sits plain, a rank-5 gets spokes and
orbiting sigils, and a 妖王 in a 章 medallion brings a full corona. The grid stays a grid
while the creatures escalate.

## 物 Items — flat marks on a rarity tile

The 五階 ladder — 凡 Common · 靈 Spirit · 玄 Mystic · 地 Earth · 天 Heaven — is carried by
the **tile**, not by the object. The same pill at Common and at Heaven is one drawing in
two frames, so rarity reads across a grid without a word being read.

## The palette

Lacquer `#05100D` ground. Jade `#4ECFA3` for chrome, gold `#D4A843` for value, vermilion
`#C8442C` for danger and for seals. Neutrals are green-biased, drawn from the ground
itself, never pure grey.

五行 sets everything else: 木 `#8FD9A0` · 火 `#F0906A` · 土 `#F2CE72` · 金 `#DCE6EE` ·
水 `#8FB4F0`.

## Rules

1. Judge every asset composited on the lacquer ground. The game has no white.
2. Objects, masks and marks are generated. Faces are not attempted.
3. A new subject extends a vocabulary. A one-off needs a reason in writing — one-offs are
   how the last library drifted.
4. What the art must carry, in order: the realm you are in, the rank of what you are
   looking at, whether something happened. Beauty is third; an idle game is read a
   hundred times a day and admired twice.

## If painted art arrives later

It replaces the marks one for one. The tiles, the frames, the palette and the layout
stay; only what sits inside them changes. Nothing in `sim/` or in the screens knows the
difference.

---

## 器 Gear icons, materials, and the 鍊 aura

**Eighteen gear icons, not six.** The first attempt hung a beast motif on a fully drawn
slot object as a crest, and failed visibly: at icon size the object filled the tile and the
motif shrank to a scratch, so three pendants came out as three identical pendants. The
hierarchy inverts. A slot is a **mount** — 冠 a band, 袍 a collar, 佩 a cord, 靴 a cuff and
sole, 環 a hoop, 器 a lid and bowl — minimal, readable by silhouette alone, and the beast's
**motif is the body of the thing**.

Four things read off one tile and none of them compete for the same pixels:

| reading | carried by |
|---|---|
| 階 tier | the frame — colour, border, corner diamonds, 漢字 |
| 相 phase | the mark's colour — 五行 |
| 位 slot | the mount's silhouette |
| 源 origin | the motif |

**Eighteen materials** use the same motifs with no mount, on a low plinth, so a bag of
materials never reads as a bag of equipment. A tiger fang and a serpent fang stop being the
same grey tooth with a different label.

**Eighteen motifs**, one per beast, authored in a local box of about ±30 and composited by
transform — the same method as the 饕餮 masks, and for the same reason: eighteen distinct
things out of one vocabulary and a table, not out of eighteen drawings. Frontal and
mirrored wherever the creature allows it, because a mirrored half cannot have an outline
that drifts.

**The 鍊 aura, in nine bands.** `band = ⌈鍊/5⌉`, 0 to 9 across a bar that runs 0→45 — the
same nine as the realms and the layers, in the same escalating vocabulary as the
cultivator's realm aura:

| band | added |
|---|---|
| 1 | an inner glow |
| 2 | a halo ring |
| 3 | motes |
| 4 | corner rays |
| 5 | a turning dashed ring |
| 6 | orbiting nodes |
| 7 | a rising column |
| 8 | radiating spokes |
| 9 | 九雷 nine bolts, and a vortex |

Cumulative — band 7 still carries band 3's halo, or the ladder would not read as a ladder.
The **+N** plate sits top-left on its own ground. Because the frame carries tier
independently, **+20 玄** and **+20 天** are two different objects at a glance.

### Honest weak points

The ape went through two versions as a fist and read as bread both times; it is now a split
boulder, which works but abandons the animal. The hare took three passes before the ears
stopped fusing into one stroke. The lynx's frost star is the thinnest motif in the set and
is the first thing that will disappear at small sizes.
