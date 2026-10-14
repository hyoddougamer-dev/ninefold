# 季 Season 0 · 開天 Heaven Opens · the art it needs

Every picture below does not exist yet. In `season0.html` each one has a stand-in marked
**PLACEHOLDER** with the number used here.

Paste **STYLE** first, then the prompt. For icons and emblems use **STYLE-ICON** instead.
Both blocks are the game's own, copied verbatim from the art prompts already in use.

**STYLE** (scenes)
```
Style: classical Chinese ink painting on aged silk. Wet brush, visible strokes, ink bleeding into the fibre, large areas of empty paper. Muted mineral pigment only: jade green, gold leaf, cinnabar red, bone white, soot black. No neon, no glow, no rim light, no lens flare, no science fiction, no cyberpunk. Nothing emits light except a lantern or the moon. It should look like a plate from a bestiary somebody believed in six hundred years ago. No text, no letters and no characters anywhere.
Composition in the Song dynasty manner: the subject small against a great deal of empty space, mist swallowing the middle distance. No seal, no watermark, no border.
```

**STYLE-ICON** (emblems, seals, items)
```
Style: classical Chinese ink painting on aged silk, muted mineral pigment only (jade green, gold leaf, cinnabar red, bone white, soot black). No neon, no glow, no text, no letters, no characters. One object, centred, filling about 70% of a square frame, on plain aged paper with nothing else around it, so it can be cut out cleanly.
```

The season's colour is **天青 sky after rain** (`#A4BDC7`), a pale grey blue. It is not in the
STYLE palette, so the prompts below ask for it by name ("pale sky-after-rain blue, the colour
of Ru celadon") and only in small amounts. If a picture comes back bright blue, add
"greyed, chalky, like a faded glaze" to the prompt.

---

## 1 · 開 Season emblem (icon, 1:1)

- **Purpose:** the season's mark. On the first-open card (where the gold 開 seal sits now), on
  the season sheet the badge opens, on the Discord guide for the season, and as the server's
  event image.
- **Size and format:** 1024 x 1024 PNG on plain paper, cut out to transparent, served as webp
  (like `public/art/emblem/*.webp`).
- **Prompt (after STYLE-ICON):**
  `A cosmic egg of soot-black ink, round and heavy, split cleanly in two along a slanting line. The upper half lifts a little away from the lower, and through the gap shows a thin band of pale sky-after-rain blue, the colour of Ru celadon, with a single fleck of gold leaf. Wisps of grey mist curl out of the crack. Still, quiet, symmetrical enough to read at a small size.`
- **If it keeps coming out busy:** drop the mist, keep only the egg and the band of blue.

## 2 · The opening scene (scene, 3:2)

- **Purpose:** the picture at the top of the first-open card ("Season 0 has begun"). Seen by
  every player once, on the first open after 26 October.
- **Size and format:** 1536 x 1024 (3:2), served as webp at 768 wide like
  `public/art/realm/*.webp`. The card shows a band about 400 x 240 cropped from the centre and
  fades its lower third into the ink ground, so keep the subject in the upper middle.
- **Prompt (after STYLE):**
  `The first morning of the world. A vast sea of dark churning cloud is being parted along the horizon: the heavy lower half settles and hardens into the first jagged mountain peaks, the light upper half lifts away, and between them opens a long band of pale sky-after-rain blue, the colour of Ru celadon. Far off and very faint in the mist, the outline of a giant figure with a broad axe stands braced between heaven and earth, pushing them apart. In the lower left, tiny, a lone cultivator in plain hemp robes stands on a rock and looks up.`

## 3 · Discord banner background (scene, wide)

- **Purpose:** the painting behind the announcement banner (`tools/banners.mjs` layout,
  1200 x 450), and later the Season 0 guide banner. The banner darkens the left half for
  the seal and the title and stands a cut-out figure (5) on the right.
- **Size and format:** 1920 x 1080 (16:9) PNG, served as webp at 768 x 432 like
  `public/art/heaven/*.webp`. `banners.mjs` crops it to 8:3 at `center 60%`, so the middle
  band of the height is what shows.
- **Prompt (after STYLE):**
  `A sea of cloud seen from above at the first dawn, the left half of the picture dark, heavy and almost empty, soot-black mist. Towards the right the clouds part along a slanting line and a pale sky-after-rain blue shows through, the colour of Ru celadon, with a few thin threads of gold leaf on the cloud edges. A few small mountain peaks break the cloud in the lower right. No figure.`

## 4 · Season 0 board icon (icon, 1:1)

- **Purpose:** the small mark beside "季 Season 0" on the Rankings season line and on the
  realm-screen badge, and the icon for the season's titles on the boards. It is shown at 16
  to 28 px, so it must read as one shape.
- **Size and format:** 1024 x 1024 PNG, cut out to transparent; exported as webp at 128 and
  used at 16 to 28 px.
- **Prompt (after STYLE-ICON):**
  `A flat round jade bi disc seen face-on, in pale sky-after-rain blue celadon, the colour of Ru ware, with a fine crackle in the glaze. The hole in the centre shows plain paper. A single thin line of gold leaf crosses the disc from left to right like a horizon. Simple, bold silhouette, no carving, no pattern beyond the crackle.`

## 5 · Cut-out figure: the first cultivator (figure, 3:4)

- **Purpose:** the figure standing on the right of the Discord banner (where the realm 1
  cultivator stands in now), and on the Season 0 guide banner.
- **Size and format:** 1024 x 1365 (3:4) PNG on plain paper, cut out to transparent like
  `public/art/cut/*.webp` (about 390 px tall in the repo). Full figure, nothing cropped at the
  feet, so `banners.mjs` can stand it at `bottom: 24px`.
- **Prompt (after STYLE, then this; tell the tool "plain aged paper background, nothing behind the figure" so it can be cut out):**
  `A young cultivator standing, full figure, three-quarter view, in plain undyed hemp robes with a jade green sash, hair tied up simply with a wooden pin, a plain wooden staff in one hand. The head is tilted up and to the left, looking at something far above, the other hand half raised as if feeling the first wind. Calm, a beginning, no weapon drawn. The same hand and the same robes as the game's realm 1 cultivator portraits.`
- **Variant (optional):** the same figure as a woman, to alternate on later banners, as the
  existing `self/man-*` and `self/woman-*` pairs do.

## 6 · Optional: 舊 the closed-test keepsake (icon, 1:1)

- **Purpose:** only if Bruno wants it (plan decisions D3, D4 and D6). The icon on the 舊
  Closed test section of Menu, Save, on the closed-test boards page, and for a "Closed test
  veteran" Discord role.
- **Size and format:** 1024 x 1024 PNG, cut out to transparent, webp.
- **Prompt (after STYLE-ICON):**
  `A small rolled scroll of old yellowed paper tied with a cinnabar red cord, a jade bead on the knot, resting on its side. Worn edges, a little faded, kept with care.`

---

## Not needed as art

- The gold 開 seal on the card and the banner is lettering in CSS, as on every banner.
- The 天青 season line, badge and button colours are CSS (`--s0` in `season0.html`).
- The old cultivator's small portrait on the card is the game's own figure for that save's
  realm and sex (`self/man-9` in the mock).
