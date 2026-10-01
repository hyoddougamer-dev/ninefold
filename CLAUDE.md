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
- **The save is sealed** (`src/sim/seal.ts`): what the game writes to `localStorage` and the
  copy a player takes read as noise. A fabricated save written plain by a tool still loads, so
  fixtures stay plain; a tool that *reads* a save back must open it (`open` from seal.ts, which
  is why `actions` and `ranks` run under tsx). The seal is a deterrent and a tell, never the
  lock: the lock is the server (`sim/verify.ts`), and an edited save plays on but is not ranked.
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
- **A percentage padding resolves against the container's width, never its height.**
  鬥 the arena drew its floor at 12.7% of the stage's *height* in the SVG and stood its
  fighters on `padding-bottom: 12.7%`, which is of the *width*. At 400 by 400 those agreed
  by accident, and the arena had only ever been looked at there. On a 320px phone both
  fighters stood ten pixels under the ground. Name the height in a custom property and
  `calc()` off it.
- **A grid item will not shrink below its content unless it is told to.** `min-width: 0`.
  Without it a 132px painting in a 116px half did not overflow its cell, it *widened the
  column*, pushed the row past the stage and hung the beast off the side of the screen.
  This is the bug Bruno photographed, and `npm run arena` exists because of it: **look at
  a screen at 320 as well as at 400**, because nothing in the build was opening it there.
- **A balance that holds at one number and not the next is a knife edge, not a balance.**
  The Dragon's footing passed eighty crossings at 1.585 and walled them at 1.59, and every
  real player sits a few per cent away from the harness. Before trusting a tuned number,
  push the system off it (`playEndgame(80, 'pill', undefined, 1.1)` stands every Dragon a
  tenth heavier) and check it slows rather than walls. `PILL_AHEAD` is what fixed that one.
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

## 群 The testers' Discord

The server is data (`tools/discord/server.json`) made real by `tools/discord.mjs`, run
from `.github/workflows/discord.yml`. The sandbox cannot reach discord.com, so, as with
Supabase, nothing is done against Discord from here. It needs the secret
`DISCORD_BOT_TOKEN` and the variable `DISCORD_GUILD_ID`; never ask for the token in chat.
The script finds everything by name, never deletes, and a second run changes nothing:
`node tools/discord-check.mjs` proves that against a fake Discord and the workflow runs it
first. Its copy is English, like the game: Bruno's community from his previous game
(Dao of the Endless Sky) is international. The run switches Community on itself, so the
forums are real forums, and prints the server's permanent invite at the end of its log.
Moderation is Discord's own AutoMod, set from the same file: one spam, one word-list and one
mention rule per server, so the script takes over the ones Discord made rather than adding
more, and every rule reports to #師-team. The bot keeps Administrator for that and Community.
書-guides is a forum with one post per system (`posts` in server.json), written from the
game's own copy and numbers: when a system changes, its guide changes in the same commit.
Only the developer and the bot open posts; members answer inside them. The screens the
guides show live in `public/discord/`, served by Pages, and go up in a commit before the
posts that point at them, so Discord never caches a broken image.
A new post in the announcements or dev log channel tells @everyone (`announce` in server.json,
Bruno 2026-09-30); a post that went up before that gets one short `nudge` line after it.
Every post wears a banner from `tools/banners.mjs` (the game's own paintings and cut
figures, a gold seal, the logo's lettering, the cards' frame): a new post is a line in
`BANNERS` and a `banner` in server.json. **Bruno's real name never appears in anything
members read.** He signs 師 Shibaki, the name his community knows.
Android has two ways in, both in the 裝 install guide (`g-install`) and on `/testar/`: the game
installed from Chrome, and the APK in a stored zip (some phones' Chrome holds a bare .apk
at 100% for ever; a zip gets past it). The bare APK is still served, so an old link is not a
dead end, but nothing links to it any more. The guide is pinned in 書-guides and tagged
Install; a known-issue post is pinned in 報-bugs; a forum pins one post, and the script
moves a pin by taking it off the old post first. The step pictures
come from `tools/install-art.mjs`, and the Pages deploy fetches the APK and the zip from the
live site and fails unless they are the same bytes.

## 脈 The panel

`/painel/` on the game's site is Bruno's one page for the test (Portuguese, noindex). Its
top half reads `stats()`, counts only, and the public boards; `.github/workflows/watch.yml`
takes one pulse an hour (players, active, the Discord's members and online) for its chart.
Its 師 Jogadores list reads `panel_players(key)`: per player, behind a key Bruno holds. Only
the key's SHA-256 is in the repository (`supabase/migrations/20260929010000_panel.sql`);
to change the key, write a new migration with a new hash and give Bruno the new key in the
chat, never in a file. It never returns an email or an id, and the schema test holds it to
that. The repository and its Action logs are public: nothing per player is ever printed there.

## 樂 Music

Bruno makes the tracks in Suno (on a paid plan, which is what lets a game use them) and
sends the MP3s. They go in `music-src/` as they came, and `node tools/music.mjs` (with
`FFMPEG` pointing at an ffmpeg, which `npm i ffmpeg-static` in the scratchpad provides)
trims, levels and writes each as AAC and Opus in `public/music/`. `src/app/music.ts` maps
moods to tracks in `PLAYLIST`; a mood without its own track borrows one, so adding a track
is a file and a line. The test Chromium has no AAC, which is why the Opus copy exists and
why playback can be checked here at all.

## 屜 The drawer

Ideas designed, shown to Bruno and deliberately not built yet live in `docs/DRAWER.md`,
with the reason each one is waiting. Proposal A for spirit beasts (收服, the warden who
stayed) is there for a future expansion. Read it before designing anything with beasts
that follow the player: the first companion was reverted because it was a number bolted
onto fights rather than a system of its own.

## 榜 The ranked server (Supabase, live since 2026-09-26)

- Project `yqppvmuwlhibswbbvjzz`. **This sandbox cannot reach supabase.co** (the proxy
  answers 403), so nothing is done against it from here. Everything goes through
  `.github/workflows/supabase.yml`: migrations, the `sync` function, auth settings, then
  `tools/ranked.ts` attacking the live server. It runs on a push that touches
  `supabase/**`, the sim, or the workflow, and by hand with `workflow_dispatch`.
- Secrets `SUPABASE_ACCESS_TOKEN` and `SUPABASE_DB_PASSWORD` are set in GitHub. The legacy
  JWT keys are **off**: the game uses the publishable key, the function the new secret
  key (`SUPABASE_SECRET_KEYS`). Never put a secret key in the repo or ask for one in chat.
- Guests are limited to ten an hour per address (`rate_limit_anonymous_users`, read back
  after every deploy). hCaptcha is built in and **off** until both the `HCAPTCHA_SECRET`
  secret and the `HCAPTCHA_SITEKEY` repository variable exist; one without the other would
  lock guests out, so the workflow waits for both.
- Supabase refuses custom email templates on the free plan without its own SMTP, so the
  sign-in email is a link with no code. Inside the APK that link opens the browser, so
  testers there play as guests.
- Auth settings take a few seconds to apply after the PATCH says 200; the workflow waits
  for `/auth/v1/settings` before attacking.
- Deleting real rows on the live database is refused by the safety check unless Bruno asks
  for it by name and the migration is scoped to exactly what he asked for.

## Git, and what players are told

Bruno, 2026-09-29: *"a partir de agora não fazemos commits ou publicamos sem fazer updates
e devlogs para avisar os players."*

- **The working branch** (`claude/idle-fantasy-mobile-game-nzn90r`) gets every commit. A
  push there builds and tests the game but changes nothing a player sees: Pages, Discord
  and the ranked server deploy from `main` only.
- **`main` is a release.** A push to `main` updates the live game for everyone, so it goes
  only when Bruno has seen what changed (with pictures, as above) and approved the words
  the players will read, and it carries those words in the same push: a message in
  `tools/discord/server.json` (`channel: devlog`, a new `key` per release, e.g.
  `update-2026-09-30`) that the Discord workflow posts when `main` moves. Big changes are an
  announcement as well; a fix is a line in the next update post.
- **The one exception** is the game being broken for players: fix it, push, and post the
  note straight after, the same day.
- The testers' bugs and ideas are read with `tools/discord-read.mjs` through the
  `discord-read` workflow (sealed to `tools/discord/reader.pub.pem`; the private half lives
  only in the working session, so a new session makes a new pair and commits the new
  public half before reading).
