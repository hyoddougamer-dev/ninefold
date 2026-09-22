# 九境 Ninefold

An idle cultivation game for the phone. Qi gathers on its own, with the app closed,
always. Nine realms of nine rungs, nine heavens above them, and no end after that.

- **Play it:** <https://hyoddougamer-dev.github.io/ninefold/>
- **Read it:** `npm run bible` writes `bible.html`, the one page that explains the whole
  game. Every number and name on it is read out of the game's own code on every build,
  so it cannot drift from what the game does.

## Is it working?

Two commands answer that, and between them they are the whole answer.

```sh
npm test                      # the numbers, the curve, the save, 10,672 mangled saves
npm run build && npm run preview &
npm run smoke                 # the built game in a real browser: every screen opens
npm run actions               # and every verb in it does what it exists to do
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
| `npm run read -- save.json` | read somebody's run out of the save they sent you |
| `npm run bible` | write `bible.html` |
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
