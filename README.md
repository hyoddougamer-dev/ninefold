# 九境 Ninefold

An idle cultivation game for the phone. Qi gathers on its own, with the app closed,
always. Nine realms of nine rungs, nine heavens above them, and no end after that.

- **Play it:** <https://hyoddougamer-dev.github.io/ninefold/>
- **Read it:** `npm run bible` writes `bible.html`, the one page that explains the whole
  game. Every number and name on it is read out of the game's own code on every build,
  so it cannot drift from what the game does.

## Setting it up on another machine

Nothing here is tied to one computer, and the game itself needs no setup at all: the
page is live and it works on any browser.

```sh
git clone https://github.com/hyoddougamer-dev/ninefold.git
cd ninefold
npm install                   # Node 20 or newer
npm run dev                   # the game, hot-reloading, at the address it prints
```

`npm test` and `npm run bible` work straight away. The browser harnesses (`smoke`,
`actions`, `tips`, `han`, `artsheet` screenshots) drive a real Chromium, so on a fresh
machine they need one extra step:

```sh
npx playwright install chromium
npm run build && npm run preview &
npm run smoke
```

**存 Your cultivator does not travel with the code.** The save lives in the browser it
was played in, on that device, and there is no account anywhere. To carry a run to
another machine: open the corner menu, **Copy the save**, paste it into a note or a
message to yourself, then on the other machine open the same menu, **Restore from a
copy**, and paste it in. The two browsers then hold two separate runs, and whichever one
you play is the one that moves.

## Is it working?

Two commands answer that, and between them they are the whole answer.

```sh
npm test                      # the numbers, the curve, the save, 10,672 mangled saves
npm run build && npm run preview &
npm run smoke                 # the built game in a real browser: every screen opens
npm run actions               # and every verb in it does what it exists to do
npm run tips                  # and every tappable character answers, on the screen
npm run early                 # what there is to do in the first three realms, minute by minute
```

`npm test` prints the curve on every run: eight modelled cultivators, how many days each
takes to reach the ninth realm and to finish the climb. It also throws ten thousand
mangled saves and six hundred aimed ones at `validate()`, because a save is input and
that rule needs an adversary.

`npm run smoke` opens the built page in Chromium at six depths plus a brand new save,
visits every tab, opens the corner and every panel behind it, and fails on anything that
throws, renders nothing, or puts `NaN` in front of the player.

`npm run actions` is the other half of that question, and it is the one that matters
before anybody else plays: it **presses things**. Buying, fighting, losing, wearing,
melting, fusing, refining, brewing, climbing the tower, learning a node, taking a
stance, driving a beast, beating a warden, breaking through, crossing the tribulation,
and copying the save out. Each act asserts on the saved state, not on the pixels. A
button that lights up and does nothing passes a smoke walk and fails here.

## Reading somebody else's run

There is no account and no cloud, and there should not be one. What there is, is the save
the player already holds: the corner menu's **save** panel hands them the whole thing as
text, with a copy button. Ask a tester for that and read it:

```sh
npm run read -- their-save.json
pbpaste | npm run read
```

It prints where they got to, how they compare to the eight cultivators the harness
models, what they used, and the part worth having: **what is open to them and has never
once been touched**. "Reached the fifth realm on day eleven and never opened 道, with 21
points sitting unspent" is a sentence somebody can act on. "I played for a bit and
stopped" is not.

It reads and prints. It never writes anything and it never asks the network.

## The commands

| | |
| --- | --- |
| `npm run dev` | the game, hot-reloading |
| `npm run build` | typecheck and build to `dist/` |
| `npm run preview` | serve `dist/` at <http://localhost:4173/> |
| `npm test` | the test suite, and the curve |
| `npm run smoke` | drive the built game in a real browser |
| `npm run actions` | press every verb the game has, and check it did something |
| `npm run tips` | open every 註 character on every screen, and check the note lands on the screen and nothing paints over it |
| `npm run early` | 早 count the waiting in the first three realms: how long between one thing to press and the next |
| 悟道 `src/data/awakening.ts` | the three cards at each breakthrough |
| 緣 `src/data/meetings.ts` | the people on the road |
| 洞天 `src/data/herbs.ts` | what grows in the cave |
| `npm run read -- save.json` | read somebody's run out of the save they sent you |
| `npm run bible` | write `bible.html` |
| `npm run qi` | 氣查 walk every path the qi can take: every verb against the price it quotes, the ladder across an absence, a save round-tripped through `validate`, a clock that jumps backwards |
| `npm run artsheet` | 藝 write `art.html`: every drawing the game has, and where the art is weakest |
| `npm run artprops` | 議 write `art-proposals.html`: three directions for the art, drawn rather than described |
| `npm run artprompts` | 詞 write `art-prompts.html`: the 54 prompts the painted game needs, all sharing one style |
| `npm run pictures` | 畫 read `public/art/` and tell the game which paintings exist. `-- --missing` lists what is left |
| `npm run overview` · `catalogue` · `arts` · `gear-system` | printed tables, for reading a system on its own |
| `npm run icons` · `icons-png` | regenerate the icon set |
| `npm run page` · `lab` | package a single-file copy of the game or the arena lab |

## Where things are

| | |
| --- | --- |
| `src/sim/` | the pure game. `(state, instant) → new state`, no clock reads, no unseeded randomness |
| `src/sim/balance.ts` | every number that shapes a curve, in one file |
| `src/data/` | the tables: realms, beasts, gear, arts, pills, the tree, the heavens |
| `src/app/` | the screens |
| `src/app/copy.ts` | everything the player reads, in one file |
| `src/art/` | the drawings, as functions that return SVG |
| `tools/` | the harnesses the tests and the bible are both written from |
| `tools/bible.ts` | generates `bible.html` |

## 色 The palette

墨 Ink, aged paper, gold leaf and cinnabar. Eight tokens in `src/app/theme.css` hold the
chrome; the nine realms, the nine heavens and the five rarities carry their own ramps in
`src/data/`. Nothing in the set emits light, which is the whole rule.

    node tools/shot-screens.mjs shots-before   every screen, out of the real app
    npm run repaint                            repaint.html, the pairs side by side

`shot-screens.mjs` wants the preview running (`npm run build && npm run preview &`). It
drives the same fabricated cultivator through all five tabs and the arena, so two folders
shot at two commits can be put beside each other and the claim checked.

## 張 Getting the paintings, four credits at a time

An image model gives back one square picture per credit, so the unit of work is a sheet
and not a creature. `npm run sheets` writes **sheets.html**: four prompts, each asking
for a ruled album leaf of twelve panels, with a map of which panel is which creature.

    npm run sheets                                  the prompts
    npm run slice -- beasts-a ink-sheets/beasts-a.png   cut the sheet it gave back

The sheets are `wardens`, `self-woman`, `self-man`, `beasts-a`, `beasts-b`, `beasts-c`
and `realms`, nine square panels each, plus `meetings`, which is four across and three
down because an encounter is a scene and a scene wants width. `slice` measures where the rules actually landed rather than dividing the page by four,
cuts the panels, squares each one about its own subject and writes
`public/art/beast/<key>.webp`, plus `public/art/cut/<key>.webp` with the paper keyed off.
牌 the plate wears the paper; 鬥 the arena wears the cut-out. 修 the cultivator is only
ever cut out, into `public/art/self/<n>.webp`, and stands inside the aura the game draws. Then `npm run pictures` puts them in the game. It also
writes `sheet-<name>-proof.png`, the sheet with every cut drawn on it, which is the only
honest way to say the cut was right.

樣 `ink-sheets/demo.png` is a fabricated leaf, drawn from the game's own icons at exactly
the size a model returns. It is how the cutter is tested without spending a credit, and
it is the reference picture to attach to the prompt.

## 繪 Adding a painting

The game draws 牌 a plate around every creature: a frame, and inside it a painting when
there is one and the icon it has always shipped when there is not. So the art arrives one
file at a time and the game is never half-drawn.

```sh
# drop a 512x512 WebP at public/art/beast/<key>.webp, then
npm run pictures            # it goes into src/data/pictures.ts, and into the game
npm run pictures -- --missing   # what is still a silhouette
```

`npm run artprompts` writes the prompt for every one of them, all sharing one style
block, because the hard part of fifty-four pictures is not making them. It is making them
look like one game.

## The rules the code is written to

- **`sim/` is pure.** Anything that changes the numbers belongs there, never in the app.
  A reward the harnesses cannot see is a reward nobody can tell you is wrong.
- **A save is input.** `validate()` caps everything, and derived facts are derived.
- **Nothing uncapped may ever raise the qi rate.**
- **Nothing is ever taken away for being away.** Idle is the whole contract.
- **Losing a fight costs nothing**, and the screen has to keep saying so.
- **Measure before proposing and after changing.** `tools/habits.ts`, `climb.ts`,
  `endgame.ts` and `idle.ts` are read by the tests and by the bible.

`CLAUDE.md` holds the working agreements, including the traps this repository has already
sprung. It is worth reading before the first change.
