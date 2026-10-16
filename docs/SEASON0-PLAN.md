# 季 Season 0: a full restart, done safely

Written 2026-10-14 (container clock 07:43 UTC). This is a read-only review of branch `claude/idle-fantasy-mobile-game-nzn90r` at 75a3c89. Nothing here has been built or run. Every claim cites file:line on that commit. **[unverified]** marks anything that could not be checked from this sandbox. The live database cannot be reached from here (CLAUDE.md: "This sandbox cannot reach supabase.co").

## Status after Bruno's decisions (15 Oct 2026)

This review was written before the theme was chosen. Bruno decided on 15 October 2026, all final:

- **The theme is Season 0 · The Founding 開山** (docs/SEASON0-THEME.md, the checked package; its sections 2b to 2f and 3 are the spec). 落印 the seal still falls once, on the closed test.
- **The date stays** Monday 26 October 2026, 00:00 UTC, `SEASON_START = 1792972800` (D2 below said 19 October; it moved before this decision).
- **The closed-test save does not stay.** No keepsake, no archive key, no copy, no file, no restore. At load after the switch the device keeps only a four-number summary (realm, layer, marks, rebirths) for one farewell line on the season card, removes the save and its spare, and clears the summary on Begin. Sections 2.2 and 2.3 below describe the archive that is **not** built.
- **On the server** `closed_test_mine()` and the `saves_keep_closed_test` trigger are dropped by a migration before the switch; `saves.closed_test` may stay as a column but is never read or written. The closed-test copies are unreadable from the switch and deleted with Push B.
- **先行 Forerunner** (two glyphs, never 先 alone): `is_forerunner(uid)` is `profiles.forerunner` or a `sync_log` row before `season_start()`, false for banned and staff accounts. `board()`, `samsara_board()` and `my_standing()` gain a `forerunner` column. Push B's first statement sets `profiles.forerunner`, and only then deletes.
- **題名崖 The Cliff of Names:** a `firsts` table filled by the `standings_carve()` trigger from the first second of the season (gate r when `climb >= 9r`, gate 9 at the first mark), read through `cliff()`, the first 81 per gate, skipping banned, held and staff accounts. Push A2, live before the switch.
- **D1 is confirmed** (recorded in docs/DRAWER.md): no later season and not The Hundred may ever start everyone from zero.
- **Bruno's own ranked account** is neither marked nor carved: `profiles.staff`, set only through the key-checked `panel_set_staff(key, name, on)`, never his id or name in the repository.
- **Device-only players** get the local Stele line "Walked the closed test on this device", seen by them alone.
- **The words** for Discord are drafted in `tools/discord/drafts-season0.json`, one stage per main push, and docs/SEASON0-BRIEF.md section 6 holds their heart. Section 6 below is the first draft, superseded.

The decisions in section 7, as they stand now:

| | Now |
|---|---|
| D1 | Decided: (a). Season 0 is the game; The Hundred only ever an optional side life. |
| D2 | Decided: 26 October 2026, 00:00 UTC. |
| D3 | Decided: no progress of the closed test is kept, on the device or the server. The device keeps only the four-number summary until Begin, and a device-only player's one Stele line. No archive of the boards is promised. |
| D4 | Decided: 測 Tester renamed 先行 Forerunner after the switch (`was` in `tools/discord.mjs`); onboarding offers 修 Cultivator instead; footers say Season 0; the rule against sharing goes. Drafted. |
| D5 | Open: Bruno's own words for Push B, which stamps the Forerunners first. |
| D6 | Decided: no legacy mode. Nothing is kept to play. |
| D7 | Built: the time switch, `acceptsEverything(now)`. |
| D8 | Open: 天下第一 on Samsara. |

## 0. What was promised, and what this changes

- **6 Oct, Bruno** (as garrv_95883) in #general: *"my idea would be early access, so there would be only 1 wipe, the closed test one"* (digest `read1013b/digest.md:742`).
- **The bot said the same** in the rebirth thread: *"There is one wipe planned, at the end of this closed test."* (`tools/discord/server.json:3917`).
- **13 Oct, Bruno:** *"i might reset next week and launch a season 0 I'll make an announcement soon"* (digest `:811`).
- **rekaris asked on 6 Oct** whether a legacy version would stay up for people to finish their run (digest `:739`). Nobody answered that part.
- **ACCEPT_EVERYTHING is already tied to a season.** The 11 Oct poll answer "Yes, until the next season that counts" (`server.json:2028`) and the drawer (`docs/DRAWER.md:270`) both say it goes off at "the first season that counts".

Season 0 as a full restart **is** the closed-test wipe, so it keeps the 6 Oct promise to the letter. The catch is that the word "season" says there will be more. The Hundred design, which Bruno approved for season 0 (`docs/DRAWER.md:74-117`), starts everyone again every 12 weeks. If season 1 is also a fresh start, that is a second wipe and the promise breaks. See decision D1 in section 7.

## 1. The shape of the release: one timed switch, two pushes

**The deploys cannot be ordered within one push.**
- Pages deploys on every push to `main` (`.github/workflows/pages.yml:9`; the deploy is gated on `refs/heads/main` at `:99`).
- supabase.yml runs on pushes touching `supabase/**` or `src/sim/**` (`supabase.yml:21`).
- discord.yml runs on pushes touching `tools/discord/**`.
- All three start in parallel on the same push.
- supabase.yml applies the migrations *before* it redeploys the function (`supabase.yml:78`, then `:84`).

So a wipe migration that runs while the old function is still serving would let old clients write closed-test saves straight back into the wiped tables.

**So the season does not start when something is pushed.** It starts at **`SEASON_START`**, a timestamp that both the server and the game read. Everything ships dormant ahead of it:

| Step | When | What | Who sees what |
|---|---|---|---|
| **Push A** (the release) | 1 to 3 days before `SEASON_START` | All client code, the sync function, the season migration (board filters), the branch work, the ranked.ts attacks, the Discord announcement | The announcement. The game plays exactly as now until the switch. |
| **The switch** | `SEASON_START`, on the server clock | Sync refuses saves that are not season 0. Boards read only rows written since the switch (so they are empty). ACCEPT_EVERYTHING stops applying. | Each device retires its save the next time it opens (section 2). |
| **Push B** (the wipe) | Any time after the switch, once Bruno has named the rows | The wipe migration, limited to rows last written before `SEASON_START`, with a brake | Nothing visible, because the boards already ignore those rows. A short Discord line ("Season 0 is open"). |

From the switch on, the boards and the sync already ignore pre-season rows. So Push B has no race and no deadline: it can wait for Bruno to wake up and say the words (section 3.4).

**Recommended `SEASON_START`: a Monday 00:00 UTC.** Monday 2026-10-19 is 1792368000 s.
- The week board and titles run from Monday 00:00 UTC (`week_of`, `20260926000000_ranked.sql:12-15`).
- A Monday start gives season 0 a whole first week, and the closed test's last week closes cleanly.
- It is 01:00 in Lisbon. That is fine, because nothing has to be pushed at that moment.

## 2. (a) The client

### 2.1 The season marker

**A new pure module, `src/sim/season.ts`:**
- `SEASON = 's0'`. It must be a **string, never a number**. `validate()` reads numbers through `num(x, fallback)` (`load.ts:126-127`), so a numeric marker with a fallback of 0 would read every closed-test save as a season-0 save. A missing field must read as "closed test".
- `SEASON_START`, in **seconds** (the save stores seconds; see the CLAUDE.md traps).
- `seasonOf(raw: unknown): string | null` reads the marker off a raw or validated save.
- `inSeason(s, now) = s.season === SEASON && s.startedAt >= SEASON_START && now >= SEASON_START`.

**`src/sim/verify.ts:72`** re-exports `SEASON_START` on the line beside `GAME_EPOCH` (`export { SEASON_START } from './season.ts'`).
- It is *defined* in season.ts because the game never imports verify.ts. Only comments name it (`seal.ts:15`, `Ranks.tsx:20`, `captcha.ts:5`).
- If load.ts imported verify.ts, the whole verifier would end up in the bundle.

**`State` gets `season: string | null`** (around `state.ts:102`).
- `newState(now)` (`state.ts:459-461`) stamps `season: now >= SEASON_START ? SEASON : null`.
- A cultivator started on the new build *before* the switch is therefore a closed-test cultivator. It is retired with everyone else, so nobody gets a head start.

**`validate()` (`load.ts:122-124`) keeps reading every season's save.**
- It is the shape check, and dozens of tests feed it bare `{ v: 1, ... }` objects.
- It carries `season` through only when it is a known string, otherwise `null`.
- **The season is enforced at the doors, not inside validate:** `load()`, `importSave()`, the cloud pull, and the server's `sync()`.

### 2.2 Retiring a device's save, and keeping it

> **Replaced (Bruno, 15 Oct 2026): nothing is kept.** No `ninefold.save.closedtest` key is ever written. At load after the switch the device writes a four-number summary (realm, layer, marks, rebirths) to a small key for the card's farewell line, removes `KEY` and `BACKUP`, and Begin clears the summary. The archive, its read-back and the frozen path below are not built. See the status section at the top and docs/SEASON0-THEME.md 2e and 2f item 1.

Today `load()` (`save.ts:171-185`) reads the main key and the spare (`KEY` at `save.ts:12`, `BACKUP` at `save.ts:21`) and keeps **whichever is deeper**. After the switch, that rule would bring the closed-test spare back over a new season save.

New order inside `load()`:

1. Read `KEY` and `BACKUP` raw (the sealed text as stored).
2. Move any copy that is not `inSeason` to the archive. The archive is a new key, **`ninefold.save.closedtest`**, holding the sealed text exactly as it was.
   - If the archive already holds something, keep the deeper of the two (`progressOf`), and on a tie the one with the later `at`.
   - Never overwrite a deeper archive with a shallower one.
3. Remove the retired copies from `KEY`/`BACKUP` only **after** the archive write has succeeded (read it back and compare).
   - If the archive write throws (storage full or blocked), remove nothing and do not start a season save.
   - Instead show the card with "Copy" only, so the player can take the save out by hand. Data is never removed after a failed write.
4. The season copies that remain compete by depth, as today. If none remain, use `newState(now)`.
5. Return a flag `retired: { realm, layer, marks, lives } | null` for the card (2.3). It is read off the archived save through `validate()`, which still reads it.

Other rules:

- **Erase must not touch the archive.** `wipe()` (`save.ts:256-263`, behind the 滅 Erase button in `SavePanel.tsx:127-134`) must leave the archive key alone. A test holds it to that.
- **An old tab can write the old save back.** The update bar never reloads under a player (`updates.ts:12-14`), so a tab on the old build can stay open past the switch and write the closed-test save into `KEY` on pagehide (`App.tsx:296`; `save.ts:225-233` explains why that write exists).
  - The new rules handle it: the next load archives that copy again (deeper wins).
  - The season save survives in `BACKUP`, which `keepSpare` wrote on the last clean load (`App.tsx:205`).
  - The most that can be lost is the season play since the last load. **[unverified]** until the Playwright run in 2.6 opens two tabs.
- **The APK needs no rebuild.** It is a Capacitor shell around the hosted page (`.github/workflows/apk.yml:3-5,59-64`), so it gets all of this with Pages. Its storage is its own, separate from Chrome's.
- **Preferences stay.** Settings in `localStorage` (sound, music, sort orders, `prefs.ts`) are not the save. The guide, the 相 question and the prologue live in the save's `seen`, so they come back, which is right for somebody starting again.

### 2.3 What the player sees on the first open after the switch

> **Replaced by The Founding's card** (docs/SEASON0-THEME.md 2e): the farewell line from the summary, the season's law (同 驗 永), the 先行 Forerunner line when the signed-in server says so (or the signed-out pointer), the Cliff line, and Begin. No Copy, no Save as a file, no 舊 Closed test section in Menu, Save. Below is the first design, kept for its reasoning.

A full-screen card comes before the prologue. It is its own component, not a `.notice` (which blocks pointer events), with scoped class names such as `.season0 .s0card`.

- Title: **季 Season 0 has begun**.
- "The closed test is over. Everyone starts again from the first realm, and so do you."
- Their old cultivator in one line, English first: "Your closed-test cultivator: Realm 9, layer 4, 12 marks, 1 rebirth." (from the `retired` flag).
- "It is kept on this device. You can copy it out now or later from Menu, Save. It cannot be played or ranked in Season 0."
- Two buttons:
  - 存 **Copy it**: to the clipboard, in the same text format as `exportSave` (`save.ts:274-276`), with `season: null` inside so it is recognisable.
  - 檔 **Save as a file**: `ninefold-closedtest-realm9-<day>.txt`, like `saveFileName` (`save.ts:334-337`).
- 始 **Begin Season 0**: hands over to the prologue the way a new player gets it (`App.tsx:203` already opens it when `secondsAway === 0 && untouched`).
- Nothing on the card says "lost" or "deleted", because nothing is.

SavePanel gets a permanent section, **舊 Closed test**, for as long as the archive key exists. It has the same line plus Copy and Save as a file. There is no Restore button.

The welcome-back card (`App.tsx:207-212`) must not fire for the retired save's hours away.

**A device clock set before `SEASON_START`** keeps the old save playing, and the server refuses it (3.1). Ranks should say so in words: "The closed test has ended. Check the date and time on this device." This is a new `RANKS.status.season` in the `copy.ts:125` block. Today an unknown error reads `RANKS.status.unreached` (`copy.ts:173`, chosen at `Ranks.tsx:124`), which would be misleading.

### 2.4 A pasted old save cannot be played as a season save

- **`importSave()`** (`save.ts:310-330`): before `validate`, if the body is not `inSeason`, return `{ state: null, error: CLOSED_TEST_REFUSED }`, which now reads: "That save is from the closed test, which ended on Monday 26 October. It cannot be loaded in Season 0." (THEME 2e; the first wording said "kept", and nothing is.)
- **The cloud pick on sign-in** (`App.tsx:776-777`) already goes through `importSave`, so a closed-test cloud copy is never offered over a season save.
- **The sync function's `pull`** returns `null` for a copy that is not season 0 (`supabase/functions/sync/index.ts:140-143`).
- **The device is not the lock.** The marker and `startedAt` are both player input, and anyone can edit a save to set them. The seal is "a deterrent and a tell, never the lock" (CLAUDE.md). The lock is the server: an old save relabelled as season 0 is measured as a first sync from `SEASON_START` at FIRST_PACE (`verify.ts:96`) and waits. That holds only while ACCEPT_EVERYTHING is off (section 4). See risk 4 in section 7.

### 2.5 Copy

All new strings go in one `SEASON` block in `src/app/copy.ts`, in English, with no dashes (`npm run prose` counts them).

The Discord text that says "closed test" changes in Push A along with the guides, per decision D4:
- the guide footers (`server.json:235, 2324, 2361, 2743`);
- the rule "The game is in closed test" (`server.json:263`).

### 2.6 Tests, harnesses and pictures (CLAUDE.md: a visual change comes with real mockups)

**Every Playwright fixture needs the marker.**
- 34 files in `tools/` write `ninefold.save.v1` (measured with `grep -l`: actions, arena, han, kept, keys, ranks, regress, smoke, tips, workshop-play and 24 `shot-*` files).
- After the switch, on the real clock, each fixture would be retired. Its harness would then measure a fresh cultivator and still print a tick ("a harness that reached nothing passes").
- Fix: add `season: 's0'` and a `startedAt` at or after `SEASON_START`, or install the clock before the switch.
- Add a check, beside `npm run prose`, that fails on any fixture that writes the save without `season`. The harness floors (`han.ts`, `smoke.mjs`) catch the rest.

**vitest, in `save.test.ts`:**
- retiring a save;
- the archive keeping the deeper copy;
- a failed archive write removing nothing;
- an old-tab overwrite keeping the season spare;
- `wipe()` leaving the archive;
- a pre-switch `newState` being retired;
- an import refused with the message above.

**Screens at 320 and 400**, with Playwright, against a fabricated closed-test save:
- `page.clock.install()` set past `SEASON_START`;
- the app's scripts blocked while writing storage (`route('**/assets/*.js', r => r.abort())`);
- shots of the card, the SavePanel section, the paste refusal, and Ranks with a clock before the switch;
- plus a 樣 block in `tools/bible.ts`.

## 3. (b) The server

### 3.1 In the sync function (Push A, dormant until the switch)

Changes to `supabase/functions/sync/core.ts`:

1. **Refuse a save from another season** before `validate` (`core.ts:179-186`).
   - When `now >= SEASON_START` and `seasonOf(raw) !== SEASON`, return `409 { error: 'season' }`.
   - No strike, no log row, nothing written.
   - Before the switch, a season-marked save is refused the same way (it means a device clock running ahead).
2. **Old rows count as nothing.** Between the switch and Push B an account still has its closed-test rows, and today `sync()` reads all of them:
   - **`prev`** (`core.ts:222`) would be the closed-test verified save. `ahead(after) <= ahead(prev)` would hold for every new season save, so the save would be measured against the old run, get 'shape', and **never rank** until it overtook the old run. Treat a verified save that is not season 0 as absent, which makes it a first sync.
   - **The day/week anchors** (`core.ts:236-245`): skip any anchor that is not season 0.
   - **`kept` / `latest`** (`core.ts:262-270`): the cloud copy "only ever moves forward", so a deeper closed-test copy would be kept over every season save. Treat a non-season `latest` as absent.
   - **`held`** (`core.ts:230`): the tower floors "already checked" would let a closed-test floor count as won. Read 0 from a pre-season standing.
   - **`standing`** (`core.ts:292-321`): `climb`, `marks` and `tower` are `max(new, old)`, and `lives` is sticky (`core.ts:300-301`). A closed-test standing would carry its climb into the season and keep a reborn player off Heaven. Treat a standing whose `updated_at` is before `SEASON_START` as absent (index.ts reads the row at `index.ts:80`; add `updated_at` to what it reads).
3. **`firstSync`** (`verify.ts:955-959`): use `start = max(GAME_EPOCH, SEASON_START, min(now, startedAt), min(now, joinedAt) - PRE_JOIN_CREDIT)`. Without `SEASON_START` there, a **kept** account's `joinedAt` is weeks old (`index.ts:149`). Its first season sync would then be credited from three days before the account was made, weeks before the season began.
4. **`verify()`** (`verify.ts:457`): a different `season` between before and after counts as 'shape', just as a different `startedAt` does.

### 3.2 The season migration (Push A): the boards switch on their own

A migration `2026101X000000_season0.sql` that **deletes nothing**:

- **`public.season_start()`** returns the same instant as `SEASON_START`. A schema test parses both and fails if they differ.
- **The board functions read only season rows:** `standings.updated_at >= season_start()`, and titles of weeks `>= week_of(season_start())`. This covers:
  - `board()` and `samsara_board()` (latest definitions at `20261011120000_samsara.sql:45-91`);
  - `my_standing()` (`20260926020000_titles.sql:4`);
  - `close_week()` (`20260926000000_ranked.sql:160-172`);
  - `title_of()` (`20260926000000_ranked.sql:112-119`).

  Before the switch they read as today. At the switch the boards are empty, and no closed-test title is worn into week 1.
- **Bruno's panel** gets the same filter, or a "closed test" column, so it does not mix the two: `stats()` (`20260929000000_pulse.sql:21`), `panel_players` (`20261003000000_panel_refusals.sql:20`) and `panel_cheats` (`20261005140000_review.sql:78`). **[unverified]** which of their columns need it; read them when building.

### 3.3 Accounts are kept

Recommended: keep every `auth.users` row and its `profiles` row.

- **Names stay reserved.** A guest's anonymous account is its only identity, and deleting it would hand its name to anybody.
- **Sign-ins keep working.** Email players keep their sign-in, and a device that remembers its sign-in (`cloud.ts:33-36`) syncs into the season without doing anything.
- **Anyone who wants out** has 刪 delete account (`cloud.ts:100-107`).

The 28 Sep fresh start did delete accounts (`20260928210000_fresh_start.sql:30-34`), but those were Bruno's own and test-made accounts, not real players.

### 3.4 The wipe migration (Push B), its brake and its cutoff

> **Changed by the 15 October decisions.** Push B's **first statement** sets `profiles.forerunner` for every account with a `sync_log` row before the cutoff (every account, banned and staff included; `is_forerunner()` still leaves banned and staff accounts out when it reads, so a ban lifted later gives the mark back), and only then deletes anything; a schema test holds that order. The closed-test copies in `saves` are deleted with the rest (the earlier "never delete `closed_test`" rule is reversed). docs/SEASON0-PUSHB-DRAFT.md is the current draft. It still waits for Bruno's own words naming the rows.

It follows the pattern of `20260928210000_fresh_start.sql`: a quoted authorisation, a constant cutoff, a brake, and a return on an empty database (the schema test runs every migration on one).

```
-- 季 Season 0. Bruno, <date, UTC time>: "<his words, verbatim, naming each table below>"
do $$
declare
  cutoff constant timestamptz := '<SEASON_START as timestamptz>';
  brake  constant int := <Bruno's player count from the panel, plus a margin>;
  hits int;
begin
  if now() < cutoff then raise exception 'season 0 wipe: the season has not begun'; end if;
  select count(*) into hits from public.standings where updated_at < cutoff;
  if hits = 0 and not exists (select 1 from public.saves where last_sync < cutoff) then return; end if;
  if hits > brake then raise exception 'season 0 wipe: % standings predate the season, more than %; nothing deleted', hits, brake; end if;
  -- (optional, D3) copy what is kept into archive tables first, in this same block
  delete from public.standings   where updated_at < cutoff;
  delete from public.saves       where last_sync  < cutoff;
  delete from public.titles      where week < public.week_of(cutoff);
  delete from public.sync_log    where at < cutoff;
  delete from public.panel_notes where updated_at < cutoff;            -- only if named (D5)
  update public.profiles set strikes = 0, suspect = false where not banned and (strikes > 0 or suspect);
  raise notice 'season 0 wipe: % standings ...', hits;
end $$;
```

What goes, what stays, and why:

| Table | Action | Why |
|---|---|---|
| `standings` (`ranked.sql:42`; columns added by `calling.sql:7` and `samsara.sql:16-20`) | rows with `updated_at < cutoff` | the closed-test boards |
| `saves` (`ranked.sql:32`; `pinned` / `rebase` from `20261006070000` / `080000`) | rows with `last_sync < cutoff` | Closed-test cloud copies, verified copies and anchors. **Delete, never update:** `saves_pin()` (`20261006080000_rekaris_as_is.sql:20-43`) rewrites `latest` on any update of a pinned or rebasing row. A season sync after the switch sets `last_sync` past the cutoff, so it is never matched. |
| `titles` (`ranked.sql:68`) | weeks before `week_of(cutoff)` | closed-test weekly titles |
| `sync_log` (`ranked.sql:55`) | rows with `at < cutoff` | review history of saves that no longer exist |
| `profiles` | **kept**; strikes and the review flag reset; `banned` untouched | 3.3. The 8 Oct clear did the same (`20261008120000_clear_marks.sql`). |
| `barred` (`20260928000000_barred.sql:10`) | **kept** | "a fresh start for the boards is not an amnesty for a cheat" (`fresh_start.sql:17-18`) |
| `auth.users` | **kept** | 3.3 |
| `sync_turns` (`hardening.sql:8`) | kept | one rate-limit timestamp per player; nothing ranked |
| `pulse` (`pulse.sql:11`), `meta` (`ranked.sql:78`) | kept | counts for the panel; the last closed week |
| `panel_notes` (`panel_notes.sql:18`) | Bruno decides (D5) | they describe closed-test saves (e.g. "floor 352", `rekaris_as_is.sql`) |

**The rule this migration lives under (CLAUDE.md):** *"Deleting real rows on the live database is refused by the safety check unless Bruno asks for it by name and the migration is scoped to exactly what he asked for."*
- His 14 Oct decision (a full restart) is the reason for the wipe, not the authorisation.
- Before Push B is written, he says in his own message which tables and which rows: standings, cloud saves, titles, sync history, and panel notes if he wants them gone.
- His words go into the header verbatim, with the time, the way `fresh_start.sql:1-4` quotes his.
- The migration deletes exactly that and nothing more. If he names fewer tables, the others stay. Nothing in this plan fills a gap he left.

**The brake number.** The live player count is **[unverified]** from here. Bruno reads it on `/painel/` (the top half, `stats()`) the day before, and the brake is that number plus a margin. Over it, nothing is deleted and the run fails so someone can look.

**A schema test** seeds closed-test rows and season rows in PGlite, then runs the Push B file's SQL text a second time. It checks that:
- only pre-cutoff rows went;
- profiles and barred are whole;
- a banned player is still banned;
- the brake raises over its number;
- the migration raises when run before the cutoff.

## 4. (c) ACCEPT_EVERYTHING, SEASON_START and the attacks

### 4.1 ACCEPT_EVERYTHING off, in the same release

While `ACCEPT_EVERYTHING` (`core.ts:160-170`) is `true`, a save the rules refuse is counted as verified and moves the boards. Only "went-down" is excluded (`core.ts:254-256`). The comment itself says *"Set it to false before the first season that counts."*

**Why it has to be the same release:**
- **`startedAt` is player input.** `validate` takes it from the save and only clamps it to `[0, now]` (`load.ts:130`).
  - The only thing that stops a save from claiming months of play is `firstSync` measuring from the server's own bounds (`verify.ts:955-959`), plus the verdict refusing what is too fast.
  - With ACCEPT on, a refused verdict ranks all the same. So **any** closed-test save, relabelled `season: 's0'` and edited past the seal, would take first place in the minute the season opens.
  - A full restart with ACCEPT on is a restart only for honest players.
- **On kept accounts the hole is wider.** `joinedAt` is the account's creation date (`index.ts:149`), weeks before the season, so even the first-sync budget would reach back weeks. `SEASON_START` in `firstSync` (3.1.3) closes that part; ACCEPT off closes the rest.

**How:**
- Replace the constant with `export const acceptsEverything = (now: number) => now < SEASON_START;` and pass `{ accept: acceptsEverything(now) }` at `index.ts:151-152`.
- The closed test's last days stay as lenient as Bruno set them on 11 Oct, and the season is strict from its first second without another push.
- `tools/ranked.ts:20` imports the function instead of the constant.
- If Bruno prefers a plain constant set to `false`, it goes in Push A, and the closed test's last days become strict too. That means strikes and review flags, which Push B resets anyway.

**The cost, said out loud:** honest first syncs that are faster than FIRST_PACE allows will wait instead of ranking.
- Measured on 30 Sep, before FIRST_SITTING existed: 195 of 591 syncs were held back (`verify.ts:98-109`).
- FIRST_SITTING now covers a new player's first hour.
- **[unverified]** how often a season-0 first sync waits. `npm test` prints the curve, and Push A should report it.

### 4.2 SEASON_START next to GAME_EPOCH

`src/sim/verify.ts:72` re-exports it (2.1), and `firstSync` reads it (3.1.3). It is one number in one module. The device reads it (`load`, `importSave`, `newState`), the function reads it, and `season_start()` mirrors it in SQL, with a test tying the two together.

### 4.3 Attacks to add to `tools/ranked.ts`

supabase.yml runs ranked.ts after every deploy (`supabase.yml:184`). Push A runs it before the switch and Push B after it, so each attack branches on `now >= SEASON_START` and both halves run live.

After the switch:

1. **A closed-test-shaped save** (no `season`) from a new guest gets `409 season`, has no `ranked` field, and the player is not on `board('climb')`.
2. **`pull`** after that returns `save: null`.
3. **A season save whose `startedAt` is 30 days before the switch**, from a guest signed up now, gets `state: 'waiting'` and is not ranked. This is today's forged-save test (`ranked.ts:104-112`) with the marker added.
4. **A season save at the 9th realm** that claims `startedAt = SEASON_START` is not ranked.
5. **The edited-qi save** (`ranked.ts:83-88`) gets `ranked === false`, now that ACCEPT is off.
6. **A season-marked save sent before the switch** gets `409 season` (Push A only).
7. **No stray rows:** `board('climb')`, `board('week')`, `board('tower')` and `samsara_board` hold no row the test did not make in the minutes after Push B. **[unverified]** whether that can be told apart from real early players through the public API alone; it may have to stay a schema test.

Some cases cannot be reached live, so they go in `src/sim/__tests__/sync.test.ts` with the in-memory store. A **kept** account (`joinedAt` 30 days back) whose closed-test rows are still present syncs a season save, and the test checks that:
- it gets a first sync from `SEASON_START`;
- its old `lives`, `tower` and `climb` do not carry over;
- its old, deeper `latest` is not kept over the season save;
- a forged `startedAt` before the season gets no credit.

**One existing fixture needs a fix.** `ranked.ts:63` uses `newState(now - 600)`. Within ten minutes of the switch, that is a closed-test save under the new `newState`. Use `newState(Math.max(now - 600, SEASON_START))`.

## 5. (d) Release order and the branch work

### 5.1 What is waiting on the branch

`git log origin/main..HEAD` (measured) shows 32 files and three features. All three are approved in words and none is released (`docs/DRAWER.md`, Rebirth section; `docs/STATUS-2026-10-13.md:62`):

- **CRAFT_CARRY 1** (`src/sim/balance.ts:1087`; main has 0.25).
- **The typed Reincarnate confirm** (`src/app/ui/Rebirth.tsx`, `copy.ts:1370-1371`).
- **The Samsara board** (`supabase/migrations/20261011120000_samsara.sql`, core.ts +23 lines, index.ts +7, `Ranks.tsx`). Open question: the 天下第一 title on Samsara (the poll was tied 1 to 1).

**All three go in Push A**, so Season 0 begins under the rules everyone will play it with, and no rules change mid-season.
- In practice none of them matters for weeks. A rebirth needs the first mark (REBIRTH_MARKS 1), which comes after the summit, and the harness puts the summit at 36 to 134 days from a fresh start depending on habit (`docs/DRAWER.md:102-106`).
- The Samsara migration's backfill (`samsara.sql:22-43`) runs over closed-test rows and is harmless: those rows are ignored from the switch on and deleted in Push B.

**The Samsara ordering.** The drawer asks for the Samsara migration to be "deployed before the client" (`docs/DRAWER.md`, last line of the Rebirth section). In Push A the two deploy in parallel.
- The client only calls `samsara_board` for a cultivator who has reborn (`cloud.ts`, `board()`).
- For the few minutes between Pages and the migration, a closed-test reborn player who opens that tab gets an error.
- **[unverified]** how Ranks shows that error. Check it, or add the gate described in 5.2.

### 5.2 Order of operations

1. **On the branch, now:** build sections 2 to 4. Run `npm test`, `npm run prose`, `npm run han`, `npm run smoke`, `npm run tips` and `npm run arena`. Take screens at 320 and 400 and add the bible 樣 block.
2. **Show Bruno** the screens, the announcement and the plan for the rows (in Portuguese, short). He decides D1 to D8.
3. **Push A to `main`**, carrying the words in `tools/discord/server.json`:
   - the announcement (`announce`, so it tells @everyone);
   - the updated guides (boards guide: Samsara and strict checks; install guide unchanged; footers);
   - a reply in the rebirth thread that promised one wipe.

   Then watch for: supabase.yml green (migrations, function, the pre-switch half of ranked.ts), Pages deployed, Discord posted. If supabase.yml fails, the client is already live but dormant. Either fix it before the switch, or move `SEASON_START` (one number in season.ts and one in SQL, both in one push).
4. **The switch** happens on its own. Nothing to push.
5. **Bruno names the rows** in his own words (3.4). Read the live player count from the panel.
6. **Push B to `main`:** the wipe migration with his words, plus a `nudge` line in server.json ("Season 0 is open"). supabase.yml runs ranked.ts again, so the post-switch half of the attacks runs live for the first time.
7. **Read the testers' Discord** the next day with `discord-read`, looking for anyone who lost something.

**Two pushes, or a gate? Two pushes, as above,** because the switch is a time, not a deploy.
- A gate inside one push (pages.yml waiting on supabase.yml for the same sha) only orders the deploys.
- It does not stop the old function from writing during the migration, so the wipe would still race.
- The time switch removes both problems.
- A gate is still worth adding to pages.yml for the Samsara ordering if the check in 5.1 shows the error is ugly.

### 5.3 Pushes to `main` during the season (audit of 16 Oct, deploy-order)

Once the season is open, a push that changes the sim reaches players and the server in no order: Pages and supabase.yml start together. For those minutes (and for days, for a tab nobody reloads) the client and the server can disagree about a climb, and a refused sync counts against an honest player.

- **Ship the worker stamp first.** From the Push A that carries `tools/swstamp.ts`, every build is a new `sw.js`, so an open game offers 新 the update within thirty minutes (`updates.ts` asks every half hour). Before it, no release since 28 September reached an open tab on its own.
- **Server first, then the client,** for any push that touches `src/sim/**` or `src/data/**`: run supabase.yml by hand (`workflow_dispatch`) on the exact commit that will go to `main`, wait for it to go green, then push `main`. The lasting fix is pages.yml's `deploy` job waiting for supabase.yml on the same commit; it does not today. A push that changes only screens or words needs neither.
- **A change the server must accept before the client sends it** (a new field, a looser check) goes in one push and the client that uses it in the next.

## 6. (e) The announcement (draft, English, no dashes)

> **Superseded.** The announcement for The Founding, and every other Season 0 post, is drafted in `tools/discord/drafts-season0.json` (stages by day, proved against a fake Discord by `node tools/discord-check.mjs`); docs/SEASON0-BRIEF.md section 6 holds their words. The draft below promised a kept copy, which Bruno's decision removed.

Channel: announcements, with @everyone (`announce` in server.json). `[DATE]` and `[TIME]` are left for Bruno. The bracketed choices are his (section 7).

> **季 Season 0 begins on [DATE]**
>
> On [DATE] at [TIME] UTC the closed test ends and Season 0 begins. Everyone starts again from the first realm. That means the game on your phone or browser too, not only the boards.
>
> On 6 October I said there would be only one wipe, the one that closes the test. This is that wipe. [If D1 is (a): There will not be another.] [It comes earlier than you might have expected.] The game changed a lot under you in these weeks, and starting everyone level is the only fair way to rank it.
>
> **What you keep.** Your account and your name. Your closed-test cultivator stays on your device as a copy: the first time you open the game in Season 0 it shows it to you and lets you copy it out, and it stays in Menu, Save afterwards. It cannot be played or ranked in Season 0. [The final closed-test boards are kept on a page of their own.]
>
> **What changes.** The server checks every save again, as it did until 11 October: a save that is faster than anyone honest waits until real time catches up, and nothing is lost by waiting. Rebirth keeps all of your crafting experience, asks you to type Reincarnate, and puts you on the Samsara board.
>
> **If the game is open on [DATE],** take the update when it offers it.
>
> Thank you for the closed test. Almost everything in Season 0 is there because you played it and told me what was wrong.
>
> · 師 Shibaki

I checked the draft for dashes by eye. Once it is in server.json, run `npm run prose` if its check covers that file. **[unverified]** whether prose.ts reads server.json.

## 7. (f) Risks, and what Bruno must decide

### Decisions

> Where each of these stands now is in the table in the status section at the top.

- **D1. The promise and the next season.** "Only one wipe" holds only if Season 0 never ends in another fresh start, but The Hundred (`docs/DRAWER.md:88`) starts everyone fresh every 12 weeks. Pick one before announcing:
  - (a) Season 0 is the game from now on, and future seasons are optional side lives that never touch it (the Hundred's "Eternal" save, `DRAWER.md:89-90` and `245-247`); or
  - (b) seasons reset, and the announcement says plainly that this promise is being changed.

  The draft above is written for (a).
- **D2. The date and hour of `SEASON_START`.** Recommended: Monday 2026-10-19 00:00 UTC (1792368000). Push A has to be merged and green at least a day before.
- **D3. Rankings history.**
  - Archive the closed test's final boards and titles, or let them go? An archive would be a snapshot of the public `board()` rows taken before Push B, names and numbers only, committed or shown on a page.
  - The closed-test cloud saves: keep them server-side in an archive table each player can read their own copy from, or delete them with the rest? If kept, `delete_me()` (`20261005140000_review.sql:17`) must delete that copy too.
  - Keeping them is the more honest answer for anybody whose only copy was in the cloud, on a phone they no longer have.
- **D4. Discord.**
  - Does 測 Tester change (a rename, or a new role for closed-test players such as "Closed test veteran")?
  - Does the rule "The game is in closed test. Ask before sharing it outside the server" (`server.json:263`) still hold?
  - Do the "closed test" footers (`:235, :2324, :2361, :2743`) become "Season 0"?
  - The roles today are 師 Developer, 守 Guardian, 測 Tester, 觀 Follower, 告 New builds, 筆 Dev log, Android, iPhone and Browser.
- **D5. Which rows**, in his own words (3.4): standings, cloud saves, titles, sync history, panel notes.
- **D6. A legacy mode** (rekaris, digest `:739`). The archive makes it possible later, as a "play the closed-test cultivator, unranked" switch. It is not in this plan. Bruno should say yes or no, so the announcement does not imply it.
- **D7. ACCEPT_EVERYTHING:** a time switch (recommended) or a constant `false` in Push A (4.1).
- **D8. 天下第一 on Samsara** (the tied poll), decided before Push A, since the board ships with it.

### Risks

1. **An old tab** writes the closed-test save over a season save. The spare and the re-archive handle it (2.2), and the loss is bounded by the play since the last load. Prove it with two tabs in Playwright.
2. **A wrong device clock.** A clock behind the switch keeps the old save playing, unranked. A clock ahead of it retires the save early (archived, nothing lost). Either way Ranks must say why (2.3).
3. **Fixtures without the marker** turn every harness into a pass that measured nothing (2.6). This is the most likely way for the release to look fine and not be.
4. **A relabelled closed-test save.** With ACCEPT off it is a first sync from `SEASON_START` at FIRST_PACE, and it waits. Once real time catches up with what the fastest honest player could have done, it ranks. That is the existing rule for every save, not a new hole, but it means a veteran who hand-edits a sealed save can rank at the pace of the fastest honest player.
5. **Honest first syncs that wait** once ACCEPT is off (4.1). Measure this and report it before Push A.
6. **Push A green but Push B refused by its brake.** This is harmless, because the boards already ignore old rows. Look into it, fix the number with Bruno, and push again.
7. **The panel mixes seasons** until its functions are filtered (3.2).
8. **The bible and the guides** describe the closed test in places. In Push A, sweep `server.json` and `tools/bible.ts` for "closed test", "testing" and "accepts". Each guide changes in the same commit as its system (CLAUDE.md, 群).
9. **CLAUDE.md** gets a new trap entry in Push A: "a save carries `season: 's0'`; a fixture without it is retired at load and the harness measures a fresh cultivator."