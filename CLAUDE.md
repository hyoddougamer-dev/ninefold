# 九境 Ninefold · how this repository is worked on

Bruno builds this from a phone. These are the standing agreements, written down
because a working agreement that lives only in a conversation is lost at the next
compaction.

## Language

- **The game and all the code are in English.** Every identifier, comment, commit
  message and line of player-facing copy.
- **Talking to Bruno is in European Portuguese**, not Brazilian.
- Keep explanations short and plain. No long technical build-ups.
- **No em-dash as a rhetorical beat, anywhere.** Not in the game, not in the bible, not
  in a message to Bruno. He named it directly: *"texto muito AIsh e com muitos travessões
  longos."* `npm run prose` counts them in the player copy **and** in `bible.html`, and
  both read zero. A sentence that needs a dash usually wanted a full stop. Where the dash
  was introducing the thing it named, a colon is right; where it was a pair, brackets
  are; where it joined two clauses, a comma or a full stop. **Never `, the`**: that turns
  "X — the player would…" into a comma splice, which is worse than the dash was.
  The only dashes left in the repository are the ones standing for *nothing* in an empty
  table cell, and the tooltip's own aria-label.

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
  randomness. Anything that changes the numbers belongs here, never in the app. A
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
- **Measure before proposing and after changing.** The harnesses in `tools/`
  (`habits.ts`, `climb.ts`, `endgame.ts`) are read by the tests and by the bible.

## The traps this repo has already sprung

Each of these cost real time once. They are written down so they cost it once.

- **The save stores seconds, not milliseconds.**
- **The app rewrites its save on page unload**, so editing `localStorage` has to be
  done with the app's scripts blocked (`route('**/assets/*.js', r => r.abort())`).
- **Beast keys are `rat`, `hound`, `frog`**, not `mountain-rat`. Gear templates are
  `sword5`, not `sword-5`. A fixture with a wrong key is silently dropped by
  `validate()`, and the test then measures nothing.
- **The preview serves at `http://localhost:4173/`**, not `/ninefold/`: `base` is
  relative.
- **Read the container clock with `date -u`.** Elapsed time has been misjudged by
  tens of minutes without it.
- **To see something that happens minutes in, drive the clock.** `page.clock.install()`
  and `page.clock.runFor(ms)` move the built game's own clock, so 入定 ending at fifteen
  minutes is readable off the real screen in a second. Waiting it out is not the only
  option and nobody was ever going to catch it by watching.
- **A `.notice` card blocks pointer events.** Dismiss it before clicking anything.
- **`pgrep -f <name>` matches the waiting loop's own command line**, so an
  `until ! pgrep -f x.mjs` loop never exits.
- **`.beast` is the one class two screens share, and it is on purpose.** 狩 the hunt list
  and 器 the fuse groups are the same row: a seal, a name, a figure on the right. The
  fuse one carries `fuserow` as well, so a test or a rule can name one screen without
  touching the other. Restyle `.beast` and check both.
- **A filled animation leaves a transform behind, and a transform traps `position: fixed`.**
  `.sheet > * { animation: sheetin .13s ease-out both; }` keeps `matrix(1,0,0,1,0,0)` on
  every card for the life of the screen, because `both` keeps an animation in effect
  after it ends. An identity matrix is still a transform, so that card becomes the
  containing block for any fixed descendant **and** opens a stacking context. 註 the
  tooltip was placed against the scrolled list instead of the screen, and its
  `z-index: 45` only ever ranked it against its own siblings, so the next card painted
  over it. Anything that has to float over the whole screen goes through a portal into
  `document.body`. `npm run tips` opens every character on every screen and fails if a
  note lands off the screen or has anything painted on top of it.
- **A translate cannot be clamped.** The same tooltip was centred with
  `translateX(-50%)`, which put a 300px note 105px off the left edge for any character in
  the left margin. Measure the real box, then clamp its edges.
- **Never share a CSS class between two screens.** `.help` was the save panel and the
  help sheet; `.ladder` was the game's climb widget and the bible's realm cards. Both
  cost a debugging session. Scope every new block (`#mockups .ladder`, `.condense .chead`).
- **No backticks inside `tools/bible.ts` prose.** The whole page is one template
  literal, so a stray `` ` `` around a function name ends the string and the build fails
  with a parse error fifty lines away. Use `<code>`.
- **A harness that reached nothing passes, and that is the worst kind of green.** 相 the
  question the game asks before the climb covers the whole screen until it is answered,
  and every fabricated cultivator in `tools/` had to be told it had been asked
  (`seen: [… , 'whom']`). Before that, `npm run han` walked into the question, reached
  twenty places instead of 101, found nothing wrong with any of them and printed a tick.
  `npm run smoke` was the one that said so out loud, because it asserts that a tap
  lands. **Any harness that counts things should assert the count has a floor**, which
  `han.ts` now does.
- **Read the harness by name, never by position.** `RUNS[0]`, `const [waiter, , , active]
  = runs`. Adding one cultivator to `HABITS` silently made every assertion and every
  sentence on the bible page about somebody else. Use `runs.find(r => r.habit.name === …)`.

## Where things go

- `src/sim/` is the pure game. `src/data/` the tables. `src/app/` the screens.
- `src/app/copy.ts` holds everything the player reads, in one file, so it can be reviewed
  and so a translation has one place to replace.
- `tools/bible.ts` generates `bible.html`, republished to the artifact as a living
  document: **https://claude.ai/artifact/NAEtbynbgUakGDESfpSp8W**

  The link changed once, on 2026-09-22. Publishing over an existing artifact requires
  reading the published copy in full first, and the bible's own realm drawings tokenise
  to several hundred thousand tokens, so the old link could not be written over and a
  new one was published instead. Keep the page's weight in mind: if it ever has to be
  republished over itself, the drawings are what make that impossible.

## Git

Develop on `claude/idle-fantasy-mobile-game-nzn90r`; Bruno has also authorised pushing
to `main`. Both get every commit.
