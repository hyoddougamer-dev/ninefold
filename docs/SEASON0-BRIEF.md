# The Seal Falls 落印 · Season 0 brief

Everything for Season 0 in one file: the model we adopt, the theme, the image tool, every picture with its prompt ready to paste, video prompts, the announcement and the trailer.

## Resumo (para o Bruno)

- **Data:** segunda, 26 de outubro de 2026, às 00:00 UTC (domingo à noite nas Américas). `SEASON_START = 1792972800`.
- **O modelo:** recomeço total. É o wipe prometido no fim do teste fechado e é o último. A partir daí a Season 0 é o jogo; nada volta a ser apagado.
- **O que cada jogador guarda:** uma cópia do cultivador do teste fechado, que pode copiar ou guardar em ficheiro (no primeiro arranque e depois em Menu, Save). Não se joga nem entra nos rankings.
- **O que começa vazio:** todos os rankings e títulos. As regras anti-batota ficam ligadas a sério. Todos começam iguais, no reino 1.
- **Tema:** "The Seal Falls 落印". Um selo vermelho gigante cai sobre a pintura: o teste fechado fica selado e guardado, e um rolo novo começa. Tinta preta, seda clara, um só vermelho (o cinábrio do jogo) e folha de ouro.
- **Ferramenta de imagem:** o ChatGPT, o mesmo que fez a arte que já existe. Há 11 imagens novas; as 6 primeiras são obrigatórias. Cada uma tem o nome exato do ficheiro e o prompt pronto a colar.
- **Trailer:** 27 segundos, 9 planos, feito por mim em código a partir das imagens. Os vídeos de IA (secção 5) são opcionais.
- **Atenção:** "nada volta a ser apagado" também prende a Season 1. The Hundred nunca pode pôr toda a gente a zero. E o anúncio só sai quando a exportação da cópia estiver feita e a funcionar.

---

## 1. The Season 0 model (what we adopt)

### The switch

- **When:** Monday 26 October 2026, 00:00 UTC. In the Americas that is Sunday evening (Sunday 25 October, 20:00 in New York, 17:00 in Los Angeles).
- **The number:** `SEASON_START = 1792972800`. The plan (docs/SEASON0-PLAN.md, D2) still says 19 October (1792368000). It changes to 26 October in `season.ts` and in the SQL, in the same push.
- **How:** a timed switch, not a deploy. Push A goes to `main` first and sits dormant; at the hour the game and the server switch on their own. Push B (the wipe of old server rows, in Bruno's own words) follows after the switch.

### What it is

- **A full restart.** Every cultivator, on every device, starts again in realm 1. Not only the boards.
- **It is the wipe we promised** for the end of the closed test (6 October: "only 1 wipe, the closed test one").
- **It is the last one.** From then on, Season 0 is the game. Nothing is wiped again.

### What each player keeps

- **Their closed-test cultivator, as a copy they can take out.** The closed test is "sealed and kept", never "locked away".
- **How to take it out:**
  1. On the first open after the switch, a full-screen card shows the old cultivator in one line ("Realm 9, layer 4, 12 marks, 1 rebirth").
  2. Two buttons: **Copy it** (to the clipboard, the same text as the save export) and **Save as a file** (`ninefold-closedtest-realm9-<day>.txt`). Then **Begin Season 0**.
  3. Later, any time: **Menu, Save, Closed test** has the same line and the same two buttons.
- The copy cannot be played or ranked in Season 0. There is no Restore button.
- **Also kept:** the account, the name on the boards, and settings (sound, music, sort orders).
- Erase never touches the kept copy.

### What starts empty

- **Every board:** This Week (期榜), Heaven List (天榜), Samsara (輪迴) and The Tower (塔榜).
- **Every title:** First Under Heaven (天下第一), First of the Week (期首), Top Ten and Top Hundred of the Week.
- **Strikes and suspect flags** are cleared for everyone who is not banned, in Push B, if Bruno names that row change (D5). Bans stay.

### Fair play checks go fully on

- `ACCEPT_EVERYTHING` goes off in the same release. A save the server refuses is no longer counted.
- A save faster than the fastest honest player waits until real time catches up. Nothing is lost by waiting.
- The first sync of the season measures from `SEASON_START`, not from the account's creation date.

### What ships with it (Push A, plan section 5.1)

The three features already approved and waiting on the branch go out with the season, so no rule changes mid-season:

1. **Crafts keep all their experience on rebirth** (`CRAFT_CARRY 1`; main has 0.25).
2. **Rebirth asks you to type Reincarnate** to confirm.
3. **The Samsara board** (輪迴), for cultivators who have reborn.

None of the three matters for weeks: the first rebirth comes after the summit, 36 to 134 days from a fresh start.

### Before anything goes to main

- Build the season card, the kept copy, the archive and the server switch. Run `npm test`, `prose`, `han`, `smoke`, `tips`, `arena`.
- Screens at 320 and 400 and a mockup block in the bible, shown to Bruno with pictures.
- **The announcement goes out only once "take out a copy" is built and works** on a real phone and in a browser.

### Announcement timeline

| Day (2026) | What | Where | Picture |
|---|---|---|---|
| Sat 17 Oct | **Teaser.** One line, one picture. | Dev log (tells @everyone) | New picture 3 |
| Mon 19 Oct | **The announcement**, with the key art. Push A on `main` the same day, export working. Plus a reply in the rebirth thread that promised one wipe. | Announcements (@everyone) | Key art (C4) |
| Thu 22 Oct | **The trailer** (27 s video) with two lines. | Dev log | Trailer |
| Sun 25 Oct | **Reminder:** "Season 0 starts tonight at 00:00 UTC. If the game is open then, take the update when it offers it." | Announcements | Banner |
| Mon 26 Oct | **Launch line** after the switch, with Push B: "Season 0 is open. Everyone starts in realm 1. Good luck on the climb." | Announcements (`nudge`) | Banner |

Exact words for each are in section 6.

### Decisions still open (plan section 7)

- **D1. The next season.** Decided by "the last wipe": Season 1 and The Hundred can never start everyone from zero. The Hundred becomes an optional side life beside the Season 0 save (option a). Bruno confirms.
- **D2. The date.** Decided: 26 October, 00:00 UTC, `1792972800`. Push A must be green on `main` by 19 October, for the announcement.
- **D3. History.** Keep a page with the final closed-test boards? Keep the cloud saves in a server archive each player can read? (Needed for anyone whose only copy is in the cloud: see the promise check below.)
- **D4. Discord.** Rename the Tester role or add a "Closed test veteran" role; drop the "ask before sharing" rule; change the "closed test" footers to "Season 0".
- **D5. Which server rows go,** named by Bruno in his own words, for the Push B migration.
- **D6. A legacy mode** (play the old cultivator unranked): yes or no. The announcement does not promise it.
- **D7. ACCEPT_EVERYTHING off:** by the time switch (recommended) or a plain `false` in Push A.
- **D8. First Under Heaven (天下第一) on the Samsara board:** the poll was tied, decide before Push A.

### Promise check (flag to Bruno)

1. **"Nothing is wiped again" binds Season 1 too.** The 12-week restart in The Hundred (docs/DRAWER.md, decision D1) must never start everyone from zero. Only an optional side life fits the promise.
2. **"Your cultivator is kept as a copy" must be true for everyone.** The plan keeps the copy on the device. A player whose only copy is in the cloud (a lost phone, a new device) has nothing on the device. Either keep the cloud saves in a server archive (D3), or soften the line to "kept on your device". Decide before 19 October.

---

## 2. The theme: The Seal Falls 落印

**The hook:** The closed test is sealed and kept. The new scroll is never wiped.

**The idea in one line:** a colossal cinnabar seal (印, a stamp) slams onto the closed-test painting. The old scroll is stamped, rolled and kept. A blank one unrolls, and everyone paints from realm 1.

### Palette

| Role | Colour | Note |
|---|---|---|
| Ink black | `#0D0B08` | floods the left third, the black frames |
| Cinnabar | `#D2604E` | the game's own `--cinnabar` token, so the seal matches the in-game seals. Not `#B3261E`. The **only** red, and only on the seal. |
| Bone silk | `#E8D9B8` | the painting, drained of colour |
| Gold leaf | `#D4AF56` | the game's `--gold`: flecks, the Season 0 box, the date |

Type: Cinzel for THE SEAL FALLS and the date, Cormorant (italic) for the one line, Noto Serif SC for 落印. All three are already the game's fonts.

### The key visual

A colossal square cinnabar seal has just slammed onto the first realm's painting, tilted a few degrees off true. Its edges are ragged and its red is broken by little voids where the silk shows through, the way a real stamp prints.

- **Carved into it, in white:** only 九境 (Ninefold), the game's own name. Not 九境零季, which reads oddly to Chinese readers. "Season 0" is lettered in English beside it.
- **The impact:** soot-black ink drops and flecks of gold leaf flung out from the seal. **No red drops**, so nothing reads as blood or as the Demonic blood moon. Thin dry red streaks and two faint ghost outlines of the seal hang above it, so you read the fall, not just the print.
- **For scale:** a tiny meditating cultivator in solid ink at its foot.
- **The painting:** drained to bone silk, so the seal is the only colour.
- **The left third:** ink black, holding the title, English first:
  - THE SEAL FALLS in Cinzel, with 落印 in cinnabar beside it.
  - A gilt box: "Season 0 · Monday 26 October".
  - A small gold-framed box with 零 (zero) and "Season 0" under it.
  - One italic Cormorant line: "The closed test is sealed and kept. The new scroll is never wiped."
- **Top right:** a black tag edged in red: THE LAST WIPE.
- **Lettering stays big**, so it still reads as a thumbnail in Discord.

### Rules of the theme

- **Wording:** always 印 (stamp), never 封 (lock up). Always write "sealed and kept" next to "a copy you can take out".
- **Title order:** "The Seal Falls 落印". English first, characters alongside.
- **Red** stays on the seal. Splatter is black ink and gold leaf only.
- **Safety:** no white flash anywhere. Any shake lasts under 0.3 s. The video stays under 10 MB for Discord.
- **Honesty:** the empty Rankings shot is the real screen, never a mock.
- **The seal print is drawn in code**, never by the image tool, so the carving is always exactly 九境 and never invented characters.

### Changes from the current mockup (`s0v2/free/keyart.png`)

| Mockup today | Becomes |
|---|---|
| Seal carved 九境零季 (Ninefold, Season Zero) | 九境 (Ninefold) only, larger |
| Red `#B3261E` | Cinnabar `#D2604E` |
| Red and black drops | Black ink and gold leaf only |
| No zero box | Small gold box: 零 with "Season 0" |
| 落印 before THE SEAL FALLS | THE SEAL FALLS, then 落印 |
| Stand-in cultivator (self/man-1 tinted) | New picture 11 if made; the stand-in stays as the fallback |

---

## 3. The image tool

**Use ChatGPT's image generation.** It made every picture already in the game (Bruno's free GPT credits, `tools/sheets.ts`; `tools/artprompts.ts` names ChatGPT first). The same tool keeps the new pictures in the same hand.

**Settings and habits:**

1. **One new chat** for all of Season 0, so the style does not drift.
2. **First message, once:** paste the opener below and wait for "ready".
3. **Each picture:** paste its whole prompt from section 4. It already starts with the STYLE or STYLE-ICON block, word for word.
4. **Shape:** ChatGPT gives three shapes. Each prompt ends with the one to use:
   - **Landscape 3:2** (1536 × 1024): trailer shots and the banner.
   - **Portrait 2:3** (1024 × 1536): the in-game card and cut-outs.
   - **Square 1:1** (1024 × 1024): emblems, icons, the splash.
5. **Download the PNG** and save it under the exact name in section 4. Do not convert or crop: send me the PNGs and I crop, cut out and convert to WebP.
6. **If it goes wrong,** the single most useful reply is: *same composition, simpler, stronger silhouette, less detail*.
7. **If it adds characters or writing** (it will try, on seals and paper): reply *remove every character and every letter, leave it blank*. For the emblem, swap the word "seal" for "a square carved medallion".
8. **If credits are tight,** make pictures 1 to 6 first. They are the ones nothing can replace.

**Crops I make from what you send:**

| Shape you make | I crop it to | For |
|---|---|---|
| 1536 × 1024 | 1536 × 864 (16:9), shown at 1920 × 1080 | trailer shots (keep anything important away from the top and bottom edge) |
| 1536 × 1024 | 1536 × 576 (8:3), shown at 1200 × 450 | the Discord banner |
| 1024 × 1536 | 640 × 856 (3:4) | the in-game Season 0 card, like the encounter pictures |
| 1024 × 1024 | 320 × 320 | emblems in the game |
| 1024 × 1024 or 1024 × 1536 | cut out on transparent | splash, brush, stroke, cultivator |

**The opener (paste once, at the start of the chat):**

```
I am making art for a Chinese cultivation game, a xianxia story. Everything you draw for
me from now on must follow one house style, exactly, every time, with no
drift between images:

Style: classical Chinese ink painting on aged silk. Wet brush, visible strokes, ink bleeding into the fibre, large areas of empty paper. Muted mineral pigment only: jade green, gold leaf, cinnabar red, bone white, soot black. No neon, no glow, no rim light, no lens flare, no science fiction, no cyberpunk. Nothing emits light except a lantern or the moon. It should look like a plate from a bestiary somebody believed in six hundred years ago. No text, no letters and no characters anywhere.
Composition in the Song dynasty manner: the subject small against a great deal of empty space, mist swallowing the middle distance. No seal, no watermark, no border.

For this set the palette is almost colourless: soot black, bone white silk and a little gold leaf. Cinnabar red appears only where I ask for it. Do not change the style between images. Do not add anything I did not ask for. When I give you a prompt, answer with the image only.

Say "ready" and wait.
```

---

## 4. Every picture

Three kinds:
- **R: reuse.** Already in the game. Nothing to make.
- **C: code.** I draw it. Nothing to make.
- **1 to 11: new.** Made in ChatGPT with the prompt below. **Must** means the trailer or the release needs it; **Should** makes it better; **Nice** has a fallback.

### Reused (nothing to make)

| # | File | Used for |
|---|---|---|
| R1 | `public/art/realm/1.webp` to `9.webp` | Trailer shots 1 and 3 (the nine stitched into one handscroll); 2, 4, 6 and 8 behind the cuts of shot 2; realm 1 again in shots 4, 5, 6, 8 and the key art |
| R2 | `public/art/self/woman-1.webp` | Trailer shots 2 and 8 |
| R3 | `public/art/self/man-5.webp` | Trailer shot 2 |
| R4 | `public/art/cut/tiger.webp` | Trailer shot 2 |
| R5 | `public/art/cut/dragon.webp` | Trailer shot 2 |
| R6 | `public/brand/mark.webp`, `public/brand/name.webp` (as in `tools/banners.mjs`) | Trailer shot 9, key art, banners |
| R7 | The real Rankings screen, every board empty ("Nobody here yet. The first to climb is the first on the board.") | Trailer shot 7. Driven with Playwright on the Season 0 build, a fabricated save and the faked server returning no rows, which is what the live boards return after the switch. Never a mock. |

### Drawn in code (nothing to make)

| # | What | Used for |
|---|---|---|
| C1 | The seal print: square, cinnabar `#D2604E`, ragged edge, silk voids, 九境 carved white | Trailer shots 4, 5, 8, 9; key art; banners |
| C2 | The lettering: THE SEAL FALLS, 落印, the Season 0 date box, the 零 (zero) box, the italic line, THE LAST WIPE tag | Key art, trailer shot 9, banners |
| C3 | Motion: the growing square shadow, red streaks, ghost outlines, gold flecks, mist layers, the short shake | Trailer |
| C4 | **The key art**, 1920 × 1080 and 1200 × 675: R1 drained + C1 + C2 + picture 8 + picture 11 | The announcement |

### New pictures (make these)

---

#### 1 · The scroll, rolled and tied · **Must**

- **For:** trailer shot 5 ("The closed test is sealed and kept. Your cultivator stays as a copy you can take out."). Also the in-game Closed test section if we want a picture there.
- **Shape:** Landscape 3:2, 1536 × 1024 → cropped to 16:9.
- **Save as:** `s0-01-scroll-tied.png`
- **Note:** the square on the last section is left blank on purpose. I stamp the code seal (C1) into it, so it is the same print as the slam.

```
Style: classical Chinese ink painting on aged silk. Wet brush, visible strokes, ink bleeding into the fibre, large areas of empty paper. Muted mineral pigment only: jade green, gold leaf, cinnabar red, bone white, soot black. No neon, no glow, no rim light, no lens flare, no science fiction, no cyberpunk. Nothing emits light except a lantern or the moon. It should look like a plate from a bestiary somebody believed in six hundred years ago. No text, no letters and no characters anywhere.
Composition in the Song dynasty manner: the subject small against a great deal of empty space, mist swallowing the middle distance. No seal, no watermark, no border.

A long silk handscroll lying on a dark lacquer table, rolled up tight except for its last section, which is still open and shows faint grey ink mountains. On that open section there is one empty square of plain silk, about a fifth of the picture's height, left blank, with nothing inside it. A red silk cord is wrapped twice around the roll and tied in a simple knot. Low warm light from a single paper lantern at the edge of the picture. The rest is dark and quiet. Keep the scroll in the middle band of the picture, away from the top and bottom edges.
Landscape 3:2.
```

---

#### 2 · Blank silk, unrolling · **Must**

- **For:** trailer shot 6 ("A new scroll. Everyone starts level, in realm 1."). Realm 1 bleeds in through a brush stroke on it.
- **Shape:** Landscape 3:2, 1536 × 1024 → cropped to 16:9.
- **Save as:** `s0-02-blank-silk.png`

```
Style: classical Chinese ink painting on aged silk. Wet brush, visible strokes, ink bleeding into the fibre, large areas of empty paper. Muted mineral pigment only: jade green, gold leaf, cinnabar red, bone white, soot black. No neon, no glow, no rim light, no lens flare, no science fiction, no cyberpunk. Nothing emits light except a lantern or the moon. It should look like a plate from a bestiary somebody believed in six hundred years ago. No text, no letters and no characters anywhere.
Composition in the Song dynasty manner: the subject small against a great deal of empty space, mist swallowing the middle distance. No seal, no watermark, no border.

A fresh roll of blank aged silk unrolling from right to left across a dark lacquer table, the roll still on the right, the open silk completely empty and pale, filling most of the picture. One calligraphy brush rests on a small porcelain stand beside it, wet, with a single drop of black ink hanging at its tip. Soft morning light from the left. Nothing painted on the silk at all. Keep everything important in the middle band, away from the top and bottom edges.
Landscape 3:2.
```

---

#### 3 · The stone seal, a moment before · **Must**

- **For:** the teaser post (17 October) and its banner. The one picture that shows the seal before it falls.
- **Shape:** Landscape 3:2, 1536 × 1024.
- **Save as:** `s0-03-seal-above.png`
- **Note:** "No seal" in the style block means no artist's stamp printed on the painting. The stone seal object here is wanted, seen from the side, its carved face hidden.

```
Style: classical Chinese ink painting on aged silk. Wet brush, visible strokes, ink bleeding into the fibre, large areas of empty paper. Muted mineral pigment only: jade green, gold leaf, cinnabar red, bone white, soot black. No neon, no glow, no rim light, no lens flare, no science fiction, no cyberpunk. Nothing emits light except a lantern or the moon. It should look like a plate from a bestiary somebody believed in six hundred years ago. No text, no letters and no characters anywhere.
Composition in the Song dynasty manner: the subject small against a great deal of empty space, mist swallowing the middle distance. No seal, no watermark, no border.

A large carved square stone seal, dark green-black stone with a simple carved handle, held a hand's width above a sheet of pale silk, seen from the side at eye level. Its face is turned down, so the carving cannot be seen; only a thin line of cinnabar red paste shows along its bottom edge. A faint grey ink landscape is painted on the silk below. One drop of red paste is about to fall. The seal is large and heavy in the frame, the silk below it empty and calm. Dark background.
Landscape 3:2.
```

---

#### 4 · The banner background · **Must**

- **For:** every Season 0 Discord banner (teaser, announcement, reminder, launch line). The code seal (C1) stands on the right where the banners usually put a figure; the title sits on the dark left.
- **Shape:** Landscape 3:2, 1536 × 1024 → cropped to 8:3, 1200 × 450.
- **Save as:** `s0-04-banner-bg.png`

```
Style: classical Chinese ink painting on aged silk. Wet brush, visible strokes, ink bleeding into the fibre, large areas of empty paper. Muted mineral pigment only: jade green, gold leaf, cinnabar red, bone white, soot black. No neon, no glow, no rim light, no lens flare, no science fiction, no cyberpunk. Nothing emits light except a lantern or the moon. It should look like a plate from a bestiary somebody believed in six hundred years ago. No text, no letters and no characters anywhere.
Composition in the Song dynasty manner: the subject small against a great deal of empty space, mist swallowing the middle distance. No seal, no watermark, no border.

A long, low band of misty green hills and pine ridges, painted almost without colour: grey ink on bone white silk, only a trace of jade green left in the nearest ridge. The left two fifths of the picture are flooded with heavy soot-black ink wash, as if the ink was poured from the left edge and is running into the silk. The right half is pale and open, with an empty area of plain silk right of centre. A few flecks of gold leaf scattered across the pale part. Everything important stays in a horizontal band through the middle third of the picture; the top and bottom are only sky and mist.
Landscape 3:2.
```

---

#### 5 · The first open, in the game · **Must**

- **For:** the full-screen Season 0 card the game shows on the first open after the switch (plan 2.3), as a picture band at its top. A visual change, so it gets a mockup before it ships.
- **Shape:** Portrait 2:3, 1024 × 1536 → 640 × 856, like the encounter pictures.
- **Save as:** `s0-05-first-open.png` (goes in as `public/art/meet/season0.webp`)

```
Style: classical Chinese ink painting on aged silk. Wet brush, visible strokes, ink bleeding into the fibre, large areas of empty paper. Muted mineral pigment only: jade green, gold leaf, cinnabar red, bone white, soot black. No neon, no glow, no rim light, no lens flare, no science fiction, no cyberpunk. Nothing emits light except a lantern or the moon. It should look like a plate from a bestiary somebody believed in six hundred years ago. No text, no letters and no characters anywhere.
Composition in the Song dynasty manner: the subject small against a great deal of empty space, mist swallowing the middle distance. No seal, no watermark, no border.

A young cultivator in a plain grey robe kneels at a low table by an open window at dawn, seen from behind and a little to the side. To one side of the table lies a rolled scroll tied with a red silk cord, set down carefully, kept. In front of the cultivator a fresh scroll of blank silk is unrolled, and the cultivator holds a brush over it, about to make the first stroke. Through the window, far away, misty green hills of the first realm. The cultivator is small in the picture; the window, the mist and the empty silk take most of the space. Calm, a new beginning.
Portrait 2:3.
```

---

#### 6 · The season emblem · **Must**

- **For:** the Season 0 mark in the game: the heading of the Rankings screen, the Season 0 card, the Closed test section of the save panel. Also the small seal on the Discord banners if it reads at that size.
- **Shape:** Square 1:1, 1024 × 1024 → 320 × 320.
- **Save as:** `s0-06-emblem.png` (goes in as `public/art/emblem/season-0.webp`)
- **Note:** if it carves characters onto the face, replace "stone seal" with "a square carved stone medallion".

```
Style: classical Chinese ink painting on aged silk, muted mineral pigment only (jade green, gold leaf, cinnabar red, bone white, soot black). No neon, no glow, no text, no letters, no characters. One object, centred, filling about 70% of a square frame, on plain aged paper with nothing else around it, so it can be cut out cleanly.

A square stone seal standing upright, dark green-black stone, its handle carved as a small seated figure in meditation. Its face is turned down to the paper, so no carving shows. A ring of cinnabar red paste has bled into the paper around its base, as if it has just been pressed. A few flecks of gold leaf on the paper beside it. Heavy, still, simple silhouette.
Square 1:1.
```

---

#### 7 · The empty board (Rankings icon) · **Should**

- **For:** the Rankings screen while a board is empty, beside "Nobody here yet. The first to climb is the first on the board." Also the boards guide banner.
- **Shape:** Square 1:1, 1024 × 1024 → 320 × 320.
- **Save as:** `s0-07-empty-board.png` (goes in as `public/art/emblem/season-board.webp`)

```
Style: classical Chinese ink painting on aged silk, muted mineral pigment only (jade green, gold leaf, cinnabar red, bone white, soot black). No neon, no glow, no text, no letters, no characters. One object, centred, filling about 70% of a square frame, on plain aged paper with nothing else around it, so it can be cut out cleanly.

A small wooden notice board on two posts with a little tiled roof, the kind a village posts exam results on. A single sheet of pale paper is pinned to it, completely blank, ruled with faint empty lines and nothing written on any of them. A brush rests on the ledge below, clean. Simple, quiet, waiting.
Square 1:1.
```

---

#### 8 · The splash · **Should**

- **For:** the impact in trailer shot 4 and the key art, so the flung ink and gold look painted, not drawn by a computer. Fallback: code drops (as in the mockup).
- **Shape:** Square 1:1, 1024 × 1024, cut out on transparent.
- **Save as:** `s0-08-splash.png`

```
Style: classical Chinese ink painting on aged silk, muted mineral pigment only (jade green, gold leaf, cinnabar red, bone white, soot black). No neon, no glow, no text, no letters, no characters. One object, centred, filling about 70% of a square frame, on plain aged paper with nothing else around it, so it can be cut out cleanly.

A burst of soot-black ink drops and small flecks of gold leaf flung outward in every direction from an empty square in the centre, as if something heavy just struck the paper there. The centre square is clean, plain paper. Drops are large near the centre and get smaller and sparser toward the edges, with a few long dry drag marks. Black ink and gold only, no red anywhere.
Square 1:1.
```

---

#### 9 · The brush stroke · **Should**

- **For:** trailer shot 6. The stroke crosses the blank silk and realm 1 bleeds in through it (it becomes the reveal mask). Fallback: a code stroke.
- **Shape:** Landscape 3:2, 1536 × 1024, cut out on transparent.
- **Save as:** `s0-09-stroke.png`

```
Style: classical Chinese ink painting on aged silk, muted mineral pigment only (jade green, gold leaf, cinnabar red, bone white, soot black). No neon, no glow, no text, no letters, no characters. One object, centred, filling about 70% of a square frame, on plain aged paper with nothing else around it, so it can be cut out cleanly.

One single bold horizontal brush stroke of black ink across plain paper, from left to right, wet and heavy where it starts, breaking into a dry, split, feathered tail where it ends. Nothing else on the paper. It is a stroke, not a character and not a letter.
Landscape 3:2 instead of square, the stroke filling most of the width.
```

---

#### 10 · The brush, cut out · **Should**

- **For:** trailer shot 6 (the brush that makes the stroke) and shot 7 (the tip hovering over the first empty row of the Rankings screen). Fallback: no brush, the stroke alone.
- **Shape:** Portrait 2:3, 1024 × 1536, cut out on transparent.
- **Save as:** `s0-10-brush.png`

```
Style: classical Chinese ink painting on aged silk, muted mineral pigment only (jade green, gold leaf, cinnabar red, bone white, soot black). No neon, no glow, no text, no letters, no characters. One object, centred, filling about 70% of a square frame, on plain aged paper with nothing else around it, so it can be cut out cleanly.

A single Chinese calligraphy brush seen from the side, held upright with the tip pointing straight down, a dark bamboo handle with a small red cord at the top, the hair tip wet with black ink and coming to a fine point. No hand, the brush alone, upright.
Portrait 2:3 instead of square.
```

---

#### 11 · The seated cultivator, in solid ink · **Nice**

- **For:** the tiny figure at the foot of the seal for scale, in trailer shot 4 and the key art. Fallback: `self/man-1` tinted black by code, as in the mockup.
- **Shape:** Portrait 2:3, 1024 × 1536, cut out on transparent.
- **Save as:** `s0-11-sitter.png`

```
Style: classical Chinese ink painting on aged silk, muted mineral pigment only (jade green, gold leaf, cinnabar red, bone white, soot black). No neon, no glow, no text, no letters, no characters. One object, centred, filling about 70% of a square frame, on plain aged paper with nothing else around it, so it can be cut out cleanly.

A cultivator sitting cross-legged in meditation, seen from the front, hands resting in the lap, a simple robe and hair tied in a topknot. Painted entirely in solid soot-black ink as one strong silhouette, with only a few dry brush marks inside it for the folds of the robe. No face detail. Calm and very still.
Portrait 2:3 instead of square.
```

---

## 5. Optional: video prompts (image to video)

The trailer works without these: every shot can be done in code (pans, masks, mist layers, flecks). These three are the shots that gain most from real motion. Use any image-to-video tool you have (Sora in ChatGPT if your plan has it, or Kling, Runway, Luma). Settings: start frame = the picture named, 16:9, 5 seconds, highest quality, no sound. I trim each clip to its shot.

If a clip warps the painting (faces melting, colour appearing, the silk turning into plastic), drop it and the code version goes in.

**Add this to the end of every video prompt** (or in the negative prompt box if the tool has one):

```
Keep it an ink painting on aged silk the whole time. No colour shift, no glow, no lens flare, no text, no extra people, no morphing, no fast camera moves. Slow, calm, weighty motion.
```

### V1 · The scroll is tied (trailer shot 5)

- **Start frame:** picture 1 (`s0-01-scroll-tied.png`) with the code seal already stamped on it. I send you that frame.
- **Save as:** `s0-v1-tie.mp4`

```
The red silk cord around the scroll pulls tight into its knot by itself, the scroll gives one small roll and settles still on the lacquer table. The lantern light flickers very slightly. The camera pushes in very slowly. Nothing else moves.
```

### V2 · The new scroll unrolls (trailer shot 6)

- **Start frame:** picture 2 (`s0-02-blank-silk.png`).
- **Save as:** `s0-v2-unroll.mp4`

```
The blank silk keeps unrolling slowly from right to left across the table, the roll turning as it goes. The drop of ink at the tip of the brush trembles and falls onto the empty silk, spreading into a small soft blot. Morning light. The camera stays still.
```

### V3 · Realm 1, the last wipe (trailer shot 8)

- **Start frame:** `public/art/realm/1.webp` (I send a 16:9 copy at full size).
- **Save as:** `s0-v3-realm1.mp4`

```
Mist drifts slowly from left to right through the valleys between the green hills. Two small birds cross far away in the distance. The pine branches in the foreground move a little in the wind. The camera pulls back very slowly. Quiet morning.
```

### Sound (Suno, optional)

You make the music in Suno. One instrumental for the trailer, which I cut to the shots:

```
Instrumental, cinematic Chinese traditional. Opens with a low sustained string drone, slow and dark. A deep war drum swells for a few bars and ends on one single huge drum hit, followed by complete silence. Then quiet: a solo guqin plays a slow, gentle, hopeful melody, sparse, with long pauses. No vocals, no electronic sounds, no modern beat.
```

Birdsong for shot 6 is a short field recording (any free CC0 clip). The single soft "thunk" in shot 9 I make from the drum hit, quieter.

---

## 6. The words

No em dash or en dash anywhere. English, short and plain. Signed 師 Shibaki.

### Teaser · Saturday 17 October · dev log

Picture: banner from picture 3 (the seal a moment before).

> **The closed test is ending.**
> The details come on Monday 19 October.

### The announcement · Monday 19 October · announcements (@everyone)

Picture: the key art (C4). Goes out only once "take out a copy" is built and works.

> **The Seal Falls 落印: Season 0 starts Monday 26 October**
>
> The closed test ends on Monday 26 October at 00:00 UTC. In the Americas that is Sunday evening.
> This is the one wipe we promised for the end of the closed test, and it is the last one. From then on, Season 0 is the game. Nothing is wiped again.
> Your closed-test cultivator is kept as a copy you can take out.
> Everyone starts level, in realm 1.
> The ranked boards start empty, and the fair play checks go fully on. Every rank is earned.
>
> Thank you for testing with us.
> 師 Shibaki

### Reply in the rebirth thread · Monday 19 October

> On 6 October we said there would be one wipe, at the end of the closed test. It is on Monday 26 October at 00:00 UTC, and it is the last one. Your cultivator is kept as a copy you can take out. Details in announcements.

### Trailer post · Thursday 22 October · dev log

Video: the trailer.

> **The Seal Falls 落印 · the Season 0 trailer**
> Season 0 starts Monday 26 October at 00:00 UTC. Your closed-test cultivator is sealed and kept, as a copy you can take out.

### Reminder · Sunday 25 October · announcements

> Season 0 starts tonight at 00:00 UTC. If the game is open then, take the update when it offers it.

### Launch line · Monday 26 October · announcements (`nudge`, with Push B)

> Season 0 is open. Everyone starts in realm 1. Good luck on the climb.

### The text cards in the trailer

1. Nine realms. One closed test.
2. Every cultivator you raised.
3. It falls once.
4. (no text)
5. The closed test is sealed and kept. Your cultivator stays as a copy you can take out.
6. A new scroll. Everyone starts level, in realm 1.
7. The boards start empty. Fair play checks go fully on.
8. This is the last wipe. Nothing is painted over again.
9. The Seal Falls 落印 · Season 0 · Monday 26 October, 00:00 UTC, then: The closed test is sealed and kept. The new scroll is never wiped.

---

## 7. The trailer

**27 seconds, 9 shots.** 1920 × 1080, 30 fps, H.264 MP4 with AAC sound, under 10 MB (aim for 8: about 2.2 Mbit/s video). Text cards in Cormorant italic, bone white with a soft ink shadow, big enough to read on a phone; Cinzel only on the title card.

**The draft that exists now** (`s0v2/trailer/season0-trailer-draft.mp4`): 1280 × 720, 6.0 MB, Bruno's own tracks (`hunt` then `cultivate-1`) with one made drum hit. Pictures 1, 2 and 8 to 11 are drawn in code there, and shot 2 puts the figures on darkened realm paintings, not on the scroll. No birdsong yet. Each new picture replaces its stand-in with no change to the timing.

**Never cut:** shot 5, the kept-copy line, comes right after the impact and stays even if the trailer is shortened.

| Shot | Seconds | Picture | Motion and sound | Text card |
|---|---|---|---|---|
| 1 | 0 to 3 | R1: realms 1 to 9 stitched into one long handscroll | The scroll unrolls and the camera pans fast from realm 1 green to realm 9 violet. Low string drone. | Nine realms. One closed test. |
| 2 | 3 to 6 | R2 woman-1, R3 man-5, R4 tiger, R5 dragon, laid on the scroll | Four quick cuts, each under a second. Each figure settles in with a small ink bloom. | Every cultivator you raised. |
| 3 | 6 to 8.5 | The whole scroll from above (R1), colour draining to bone silk | A huge square shadow (C3) grows over it. Mist is pulled to the centre. A few gold leaf flecks lift off the silk. A drum swells. | It falls once. |
| 4 | 8.5 to 10 | C1 seal carved 九境 (Ninefold) striking R1 drained, picture 8 splash, picture 11 (or the stand-in) tiny at its foot | One black frame, then the slam. Black ink drops and gold leaf thrown out, thin red streaks and two ghost outlines hang above. Shake under 0.3 s. No white flash. One deep drum hit, then silence. | (none) |
| 5 | 10 to 13.5 | Picture 1, the scroll tied with the red cord, C1 print on its last section (V1 if made) | The seal lifts and the print stays. The scroll rolls itself up, the cord pulls tight, and it is laid down gently. Silence, then lantern hush. | The closed test is sealed and kept. Your cultivator stays as a copy you can take out. |
| 6 | 13.5 to 17 | Picture 2 blank silk (V2 if made), picture 9 stroke, picture 10 brush, then R1 realm 1 | Hard cut to quiet and birdsong. Empty silk unrolls. One brush stroke crosses it, and realm 1's first mountain bleeds in through the stroke. | A new scroll. Everyone starts level, in realm 1. |
| 7 | 17 to 20 | R7, the real Rankings screen, every board empty; picture 10 brush | Slow push in down the empty ink lines. The brush tip hovers over the first row and does not write yet. | The boards start empty. Fair play checks go fully on. |
| 8 | 20 to 23.5 | R1 realm 1 (V3 if made), R2 woman-1 small on the first peak, a small C1 seal print in the corner of the new scroll | Slow pull back, mist drifting left to right, a few gold flecks settling. The drum gives way to a single guqin line. | This is the last wipe. Nothing is painted over again. |
| 9 | 23.5 to 27 | Title card on ink black, laid out like the left of the key art (C2), R6 Ninefold logo | A small seal (C1) stamps once at the centre with a soft thunk. The lettering and the gold Season 0 box (零) fade up under it while gold flecks keep drifting. | The Seal Falls 落印 · Season 0 · Monday 26 October, 00:00 UTC |

**What I need from Bruno to make it:** pictures 1 to 6 (Must), any of 7 to 11 you can, the Suno track if you want your own music, and V1 to V3 only if you want to try them. Everything else comes from the game and from code.
