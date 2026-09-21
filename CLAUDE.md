# 九境 Ninefold — how this repository is worked on

Bruno builds this from a phone. These are the standing agreements, written down
because a working agreement that lives only in a conversation is lost at the next
compaction.

## Language

- **The game and all the code are in English.** Every identifier, comment, commit
  message and line of player-facing copy.
- **Talking to Bruno is in European Portuguese**, not Brazilian.
- Keep explanations short and plain. No long technical build-ups.

## 圖 Showing changes to the look

**Any change to art, layout, colour or anything else a player sees must come with a
visual mockup, with real examples.** Not a description of it. Bruno asked for this
directly and it is not optional:

> *"faz um mockup visual sempre com exemplos quando se altera algo relacionado com
> aspecto/arte"*

In practice that means one or both of:

- **Screenshots from the real app**, driven with Playwright against a fabricated save
  that puts the screen in the state being changed. Never a screenshot of a state that
  had to be imagined.
- **A 樣 mockup block in the bible** (`tools/bible.ts`), rendering the real markup and
  the game's own art functions, with a caption saying what changed and why.

A visual change reported in words alone is an unfinished report.

## The rules the code is written to

- **`sim/` is pure.** `(state, instant) → new state`. No clock reads, no unseeded
  randomness. Anything that changes the numbers belongs here, never in the app — a
  reward the measuring harnesses cannot see is a reward nobody can tell you is wrong.
- **A save is input.** `validate()` caps everything, and derived facts are derived
  rather than stored.
- **Every curve-shaping number lives in `src/sim/balance.ts`**, and the test suite
  prints the curve on every run.
- **The economic law: nothing uncapped may ever raise the qi rate.**
- **Nothing is ever taken away for being away.** Idle is the whole contract.
- **Losing a fight costs nothing**, and the screen has to keep saying so.
- **譯 No character is ever the only place a thing is named.** English leads; the
  characters ride alongside.
- **Measure before proposing and after changing.** The harnesses in `tools/` —
  `habits.ts`, `climb.ts`, `endgame.ts` — are read by the tests and by the bible.

## The traps this repo has already sprung

Each of these cost real time once. They are written down so they cost it once.

- **The save stores seconds, not milliseconds.**
- **The app rewrites its save on page unload**, so editing `localStorage` has to be
  done with the app's scripts blocked (`route('**/assets/*.js', r => r.abort())`).
- **Beast keys are `rat`, `hound`, `frog`** — not `mountain-rat`. Gear templates are
  `sword5`, not `sword-5`. A fixture with a wrong key is silently dropped by
  `validate()`, and the test then measures nothing.
- **The preview serves at `http://localhost:4173/`**, not `/ninefold/`: `base` is
  relative.
- **Read the container clock with `date -u`.** Elapsed time has been misjudged by
  tens of minutes without it.
- **A `.notice` card blocks pointer events.** Dismiss it before clicking anything.
- **`pgrep -f <name>` matches the waiting loop's own command line**, so an
  `until ! pgrep -f x.mjs` loop never exits.
- **Never share a CSS class between two screens.** `.help` was the save panel and the
  help sheet; `.ladder` was the game's climb widget and the bible's realm cards. Both
  cost a debugging session. Scope every new block (`#mockups .ladder`, `.condense .chead`).
- **Read the harness by name, never by position.** `RUNS[0]`, `const [waiter, , , active]
  = runs` — adding one cultivator to `HABITS` silently made every assertion and every
  sentence on the bible page about somebody else. Use `runs.find(r => r.habit.name === …)`.

## Where things go

- `src/sim/` — the pure game. `src/data/` — the tables. `src/app/` — the screens.
- `src/app/copy.ts` — everything the player reads, in one file, so it can be reviewed
  and so a translation has one place to replace.
- `tools/bible.ts` — generates `bible.html`, republished to the artifact as a living
  document.

## Git

Develop on `claude/idle-fantasy-mobile-game-nzn90r`; Bruno has also authorised pushing
to `main`. Both get every commit.
