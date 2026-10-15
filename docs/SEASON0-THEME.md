> Proposal, not decided. Published for Bruno as https://claude.ai/artifact/9c8uuzfY1jU2NDf5TFMApu (15 Oct 2026). Bruno's decision of the same day: the closed-test save does not stay; closed-test players get a permanent cosmetic mark instead.

# Season 0 · The Founding 開山 · recommended package (checked)

*Checked 2026-10-15 (container clock 08:30 UTC) against the branch `claude/idle-fantasy-mobile-game-nzn90r` at 186850d, the migrations, the sync function, the client, the harness (`founders/arrivals.ts` re-run) and every trailer frame opened by eye. It replaces `RECOMMENDED.md`. Nothing in /home/user/ninefold was changed. Section 0 lists what was wrong in the first version and what changed.*

## Resumo (para o Bruno)

- **Tema: Season 0 · The Founding 開山** ("abrir a montanha", o dia em que uma seita é fundada). O 落印 continua a ser a imagem do trailer: o selo cai uma vez sobre o closed test, e a partir daí começa a fundação.
- **Frase de 3 segundos:** *Everyone starts again. The first names are carved for ever.*
- **O foco da season:** 題名崖 **The Cliff of Names**. Nove colunas, uma por portão (Raposa, Macaco, Grou, Tigre, Tartaruga, Fantoche, Lobo, Serpente, Dragão). Os primeiros 81 a **passar** cada portão (entrar no reino seguinte; o último é a primeira travessia do Dragão) ficam gravados para sempre, com a data do servidor. Abre uma coluna nova de poucos em poucos dias durante cerca de cinco semanas.
- **O save do closed test não fica.** O jogo lê-o uma vez para uma linha de despedida ("chegou a Unity, camada 6") e apaga-o. Sem cópia, sem ficheiro, sem restauro. No servidor fica ilegível desde o primeiro segundo e é apagado no Push B.
- **A recompensa: 先行 Forerunner.** Um pequeno selo dourado com **dois** caracteres, 先行, ao lado do nome, igual para todos, para sempre, sem efeito nenhum nos números. **Não pode ser só 先**: em chinês, 先 antes de um nome lê-se "o falecido" (先父, 先帝), e ao lado do teu 師 daria 先師, "o falecido mestre".
- **Quem o recebe:** qualquer conta que o servidor tenha visto sincronizar antes de 26 de outubro, **com ou sem veredicto ok** (o registo grava o veredicto cru, por isso exigir "ok" deixava de fora testers que estavam nos rankings). Um convidado que só jogou no telemóvel tem uma semana de aviso dentro do jogo, com a hora já no fuso dele (no Brasil o fim é **domingo 25 às 21:00**).
- **O trailer v6 tem cerca de 60 s:** a pancada do selo, o rolo do closed test atado e posto de lado, o cartão com o 先行, uma montagem de nove sistemas reais na batida, o Dragão com "perder não custa nada", o Cliff e o crescimento da aura. Três frases novas em mandarim (4, 9 e 8). **A música tem de ser reeditada ou refeita no Suno** (a de agora tem um só impacto aos 21 s).
- **Calendário:** dia 19 (Push A) o aviso, o cartão novo, o save, o 先行 nos rankings e o anúncio. **O registo das gravações não tem de ir no dia 19**: tem de estar no ar antes da meia-noite UTC de 26, por isso pode ir num segundo push pequeno até dia 23, com uma linha no devlog.
- **Decisões tuas:** D1 por escrito (nenhuma season futura nem The Hundred recomeça toda a gente do zero); se a tua conta usa o selo; se um jogador só-telemóvel recebe uma linha local no 碑 (só ele a vê).
- **Alternativa real:** 長卷 The Long Scroll, 27 selos pessoais, sem corrida e sem prazo (secção 6).

---

## 0. What the check found, and what changed

Ranked by how much harm each would do if shipped as written. Every item names the file that proves it.

| # | Severity | Defect in RECOMMENDED.md | Evidence | Fix (applied below) |
|---|---|---|---|---|
| 1 | Critical | The Forerunner evidence was "a `sync_log` row with `ok`". `ok` is the raw verdict: `core.ts` logs `v` (`store.log(id, v, now)`) **before** the closed test's leniency turns a refused save into an accepted one (`accepted = rules.accept && !v.ok && ...`). A tester whose syncs were all refused-but-accepted was on the boards and has only `ok = false` rows. | `supabase/functions/sync/core.ts` lines 340-345, `index.ts` 116-120 | Any `sync_log` row at `< season_start()`, ok or not. Banned accounts excluded. |
| 2 | Critical | "Warden r counts when `standings.climb >= 9*r`" was sold as "the first 81 to **break** each warden". `climb` is `layersOpened = (realm - 1) * 9 + layer`, so `climb >= 9r` means **entered realm r+1**. From realm 5 to 8 the gate stays sealed 1 to 2 days after the warden falls (`SEAL_DAYS`), so the two differ by days. | `src/sim/state.ts:356`, `standings.climb` comment in `20260926000000_ranked.sql`, `src/sim/balance.ts:1529` | Keep the measurable rule and fix the words: the first 81 **through each gate**. The harness numbers were realm arrivals all along, so they stand. |
| 3 | High | A one-glyph mark 先 beside a name. In Chinese 先 before a person means "the late" (先父, 先帝, 先賢); "先 rekaris" reads as "the late rekaris", and next to Bruno's signature 師 it spells 先師, "the late master". | Usage, not code | A two-glyph seal **先行** (as in 先行服, an early-access server, and 先行者, pioneer). English stays Forerunner. |
| 4 | High | The deadline "Monday 26 October, 00:00 UTC" is Sunday 21:00 in Brazil and Sunday afternoon in the US. A player who opens Ranks "on Sunday night" may miss it. | `SEASON_START` 1792972800 | The notice prints the device's local time; the announcement names Sunday 25 October for the Americas. |
| 5 | High | The trailer's end line "Played the closed test? You are a Forerunner 先." and the L4 subtitle "Those who played it are Forerunners" promise the mark to device-only players who never joined Ranks. | Section 2d of the original itself | Shot 12 small line and L4 subtitle reworded (section 4). |
| 6 | High | The notice said "a guest is one tap". Joining as a guest needs a name of 2 to 20 letters, then the button; opening Ranks alone joins nothing. | `src/app/ui/Ranks.tsx` 157-173 | "Join 榜 Ranks once (a guest only needs a name)". |
| 7 | High | The card line "The server never saw this cultivator" cannot be known by the device: the player may have synced from another device, or signed out since. | `src/net/cloud.ts` (who/remembered) | The device says only what it knows: signed in, the server answers; signed out, it points to signing in (2e). |
| 8 | Medium | "Read once for the farewell line, then remove it": if the save goes at load and the app is closed before the card, the line is gone. | `src/sim/save.ts` 288-304, `App.tsx` 215 | Keep a four-number summary (`realm, layer, marks, rebirths`, never the save) under a small key until **Begin**. |
| 9 | Medium | "The carving record must be in Push A, 19 October" overstated the date. `supabase.yml` deploys on any push to `main` touching `supabase/**`; the hard date is 26 Oct 00:00 UTC. And Push A as listed was about three working days inside four, beside the trailer. | `.github/workflows/supabase.yml`, CLAUDE.md "Git" | Split: Push A on 19 Oct, Push A2 (carving) by Friday 23 Oct, with its devlog line. |
| 10 | Medium | "`board()`, `samsara_board()` gain `forerunner`" was sized as a small change. Both return `table(...)`; Postgres cannot add an OUT column with `create or replace`, so each needs `drop function`, recreate, and its grants again, plus the client types. | `20261014130000_season0.sql` | Sized again in 2f. |
| 11 | Medium | File lists missed what holds the keepsake today: `src/net/closedtest.ts`, `src/app/useCloud.ts`, `src/app/App.tsx` (the frozen path, lines 142, 215, 825), `src/sim/__tests__/sync.test.ts`, `tools/ranked.ts` 90-96 (the live attack calls `closed_test_mine()`, which item 5 drops: the deploy would go red), `schema.test.ts` 599-687, the CLAUDE.md trap about `ninefold.save.closedtest`, the `season.ts` header, and the copy keys `SEASON.name`, `han`, `ranksTag` ("Season 0 · The Seal Falls"), `notKept`, `notKeptYet`, `retry`, `later`, `oldHead`. `CLOSED_TEST_REFUSED` lives in `src/sim/save.ts`, not `copy.ts`. | grep of the branch | Full list in 2f. |
| 12 | Medium | "The 測 Tester role is renamed 先 Forerunner at the switch." `tools/discord.mjs` finds roles **by name** (line 161) and never deletes, so a new name makes a second role and leaves 測 Tester. | `tools/discord.mjs` 156-166 | A small `was` alias in `discord.mjs` and `discord-check.mjs`, shipped in a `main` push on or after 26 Oct. |
| 13 | Medium | "Bruno's own account (`garrv_95883`) is never carved." That is his Discord handle, not a ranked profile; the ranked accounts made before 2026-09-28 20:37 UTC were deleted (`20260928210000_fresh_start.sql`). Putting his id or name in a public migration is also a bad idea. | as named | A `profiles.staff` flag set through a key-checked panel call, never in the repo. Bruno decides whether it is used at all. |
| 14 | Medium | The music: v5's bed was written for **one** impact at 0:21 in 55 s (`s0v6/SUNO.md`). v6 needs a slam at 13.0, a drop at 27.3, chisels at 40.6 and a last chord near 59. "Keeps its music bed" was not possible as is. The montage cuts 1.3/1.2/1.1/1.0/0.9/0.8 s also cannot all land on a drum hit at 92 BPM (one beat is 0.652 s). | `s0v6/SUNO.md`, `audio/vo.sh` | A re-edit or a new Suno take from a v6 prompt (his plan is paid already), and cuts quantised to the beat grid (section 4). |
| 15 | Medium | Mandarin L9 首破守關者 reads as **one** person ("the one who first breaks the gatekeeper"), has no "each", and says "break the warden" (see 2). | Meaning, word by word | 率先破關者，名刻山崖，永不磨滅。 (section 4). |
| 16 | Medium | Voice timings: the take A lines were measured with silence detection; L1 speaks 2.90 s (not 2.4), L6 4.08 (3.96), L7 4.85 (4.75), so L7 ended 0.15 s before the title with no room for the hall tail. L9 at 15 syllables is about 4.4 s at take A's pace, not 3.6. | `s0v5/vo-brian/*.wav` | L7 moved to 50.1; L9 window checked (section 4). |
| 17 | Medium | "Recording: same voice and settings" missed how: `voice.yml` regenerates **every** line of `tools/voice/lines.json` on a push to the working branch, so lines 1-3 and 5-7 would come back as new reads. `vo.sh` loops `k = 1..8` with eight windows; there is no slot 9. | `.github/workflows/voice.yml`, `s0v6/audio/vo.sh` | Keep the old WAVs for 1-3, 5-7, take only 4, 8, 9 from the new run, add a ninth window. |
| 18 | Low | Montage cut g used `meet-card-pc.png`, which shows "A pool with nothing living in it" (a place, no stranger) at a zoomed scale, under the label "Strangers on the road". | opened by eye | `v-meet-road-pc-crop.png` (a ferryman who takes no money). |
| 19 | Low | `cultivate-r1-woman-pc.png` was called "green aura": it has only a faint pale edge glow. The aura cut also mixes figures (the woman at realms 1, 5 and heaven, the man at realm 7). | opened by eye | Described as "no aura yet", which helps the cut; re-shooting realm 7 as the woman stays optional. |
| 20 | Low | The law "Everyone begins in the first realm, at the same second" is false for anyone who starts in November. | copy | "The season opens for everyone at the same second, in the first realm." |
| 21 | Low | "A player with Ranks off is never carved": there is no Ranks switch; a player is in or has not joined. | `copy.ts` RANKS | "A player who has not joined Ranks". |
| 22 | Low | The Discord cut of v5 is already 9.87 MB at 55 s. At 60 s, with nine busy UI cuts, the same cap means a lower rate and softer text. | `s0v6/*-discord.mp4` | Check the UI is still readable; if not, post 1080 elsewhere and link it. |
| 23 | Info | The season and keepsake code is **not on `main` yet** (`git show origin/main:src/sim/season.ts` fails). Good: no player has the keepsake build, so no cleanup of `ninefold.save.closedtest` is needed, as long as the current retire-and-keep code never reaches `main`. | git | Stated in 2f. |
| 24 | Info | The server keeps closed-test copies in `saves.latest` until Push B (unreadable: `pullable()` refuses them and `closed_test_mine()` goes). The Push B draft still says it "never deletes `saves.closed_test`", which Bruno's decision reverses. | `docs/SEASON0-PUSHB-DRAFT.md` | Say "unreadable from the switch, deleted with Push B"; rewrite the draft. |

What was checked and is **true**: `SEASON_START` = Monday 26 October 2026 00:00 UTC; `acceptsEverything(now)` is `now < SEASON_START`; `season_start()`, `in_season()`, `title_of()`, `board()`, `samsara_board()`, `my_standing()`, `close_week()`, the `titles` table, `saves.closed_test`, `closed_test_mine()` and the `saves_keep_closed_test` trigger all exist as described; `standings` is one row per player, overwritten at the first season sync; `delete_me()` deletes its `sync_log` rows; the nine warden names and characters match `src/data/bestiary.ts`; the nine realm paintings are `public/art/realm/1.webp` to `9.webp`; six schools and seven crafts are right; the arrival table matches the harness re-run to the decimal (every hour 0.1 / 4.9 / 32.1 days, active 0.5 / 8.3 / 49.7, once a day 1.0 / 16 / 76); no theme number touches qi; nothing is removed for being away; every trailer frame named exists and shows what the storyboard says, apart from items 18 and 19; no English line contains an em-dash.

---

## 1. Scores

Unchanged from the original, with one note: the fixes above cost Founders nothing on "clear" or "impact", and they raise its buildability a little, because the carving no longer has to be in the 19 October push. Total stays **49** against Law **48** and Lore **43**.

| | Founders: The Founding 開山 | Lore: The First Strokes 初筆 | Law: The Long Scroll 長卷 |
|---|---|---|---|
| Clear to a new player in 3 seconds | **9** | 6 | 7 |
| A reason to play on day one | **9** | 6 | 7 |
| Fits the hard rules and the last-wipe promise | 8 | 8 | **10** |
| Buildable before 19 October | 6 | 7 | **8** |
| Shows the real game in the trailer | 8 | 8 | **9** |
| Impact | **9** | 8 | 7 |
| **Total** | **49** | **43** | **48** |

The reasons per score are those of `RECOMMENDED.md` section 1 and still hold. Founders wins on the two things Bruno named ("more impact", "the focus of Season 0"). Law gives the best grafts (the season law, the nine-road montage, the evidence rule, the device-only handling). Lore gives the Cliff its look.

---

## 2. The recommended theme: Season 0 · The Founding 開山

### 2a. Name, hook, and how it sits with The Seal Falls

- **Players see one name:** *Season 0 · The Founding 開山*. 開山 is the day a sect is founded (開山立派, 開山祖師). It also reads "to cut into a mountain", which suits a season whose focus is a cliff carved with names.
- **落印 The Seal Falls stays the act inside it.** The trailer's seal falls once, on the closed test. The seal closes one scroll; the founding opens the mountain.
- **Hook:** *Everyone starts again. The first names are carved for ever.*
- **Why it works:** a founding is only special if it can never happen again. "The last wipe" becomes the reason to be there.

### 2b. The season's law

Three lines on the season card. All three are built or promised, and none changes a number.

| | Law | Where it is true |
|---|---|---|
| 同 | The season opens for everyone at the same second, in the first realm. | `SEASON_START` in `src/sim/season.ts`; `in_season()` in the SQL |
| 驗 | Every rank is checked from the first second. | `acceptsEverything(now)` is false from `SEASON_START` (`supabase/functions/sync/core.ts:202`) |
| 永 | Nothing is wiped again. | D1, still to be confirmed by Bruno in writing; it binds every later season and The Hundred |

There is no seasonal qi or power modifier: on a save that is never wiped, it would be a permanent balance change wearing a seasonal name.

### 2c. 題名崖 The Cliff of Names (the focus)

**Shape.**
- Nine columns, one per gate, each named for the warden who guards it: Spirit Fox 妖狐, Stone Ape 石猿, Immortal Crane 仙鶴, Thunder Tiger 雷虎, Black Turtle 玄武, Stone Puppet 石傀, Demon Wolf 魔狼, Serpent Dragon 蛟, and the Dragon 龍.
- Column r is headed by realm r's painting (`public/art/realm/r.webp`). It stays in ink until its first name is carved, then takes its colour. By December the Cliff is a picture of how far the world has climbed.
- Each column holds the first 81 (9 by 9) cultivators **through that gate**, in order, with the server's date. 題名 is the word for a name inscribed on a list (金榜題名), so the name says what it is.

**When a player is carved.**
- Gates 1 to 8: when `standings.climb >= 9 * r`, which is the moment the server sees the cultivator **in realm r+1**. For realms 5 to 8 that is after the gate's seal has opened, not the moment the warden fell, and the copy says "through the gate", never "broke the warden".
- The Dragon: at the first tribulation crossed (`standings.marks >= 1`).
- The date is the server's clock at the verified sync. The note says "when the server saw you", because a player who crosses offline is carved at the next sync.

**When the columns open** (`habits.ts`, first arrival, days from a fresh start; re-run for this check):

| Gate | Every hour | Active | Once a day |
|---|---|---|---|
| Spirit Fox (into realm 2) | 0.1 | 0.5 | 1.0 |
| Thunder Tiger (into realm 5) | 4.9 | 8.3 | 16 |
| Serpent Dragon (into realm 9) | 32.1 | 49.7 | 76 |

So a new column falls every few days for about five weeks, and the Discord has real news each time.

**Fair play.**
- Every arrival is stored, not only the first 81, so the read function `cliff()` can skip anyone suspect or banned. A player held for review drops off until cleared, then returns at the original time.
- Whether Bruno's own ranked account is carved is his call. If not, it is a `profiles.staff` flag he sets from the panel through a key-checked function (like `panel_players`), never his name or id in a migration: the repository is public.
- A Hundred side life, or any later season, never writes to `firsts`.

**Your own carvings.** Your place is lit on the column, and 碑 the Stele gains one line: "Carved on the Cliff: 3rd through the Spirit Fox's gate."

**At the foot of the Cliff:** 先行 *Those who walked before*, every Forerunner's name with no numbers.

**Later and free:** 第一期 The First Week, a tenth panel with week one's First of the Week and Top Ten, read from the `titles` rows `close_week()` already writes. It can only appear once week one has closed.

### 2d. The closed test: 先行 Forerunner (the reward Bruno asked for)

**What it is.** One mark, the same for everyone, for good, purely cosmetic: a small square gold seal carved with **先行** (two glyphs, stacked), beside the name.
- English name: **Forerunner**. aria-label "Forerunner".
- 註 note: *"Forerunner 先行: played the closed test before the seal fell. A mark, not a save: it changes no number."*
- Its own field, never `title`, so it sits beside 天下第一 or 期首 instead of replacing them.
- No tiers: the test ran with `acceptsEverything` on and had hand-edited and restored saves, so depth would rank leniency.
- **Never 先 alone** (section 0, item 3).

**Where it is shown.**
1. Every board row: This Week, the Heaven List, Samsara and The Tower.
2. The player's own standing: the head of 榜 Ranks and the standing line on 修.
3. The Account block in Menu.
4. The season card, as its last line, for a qualifying account.
5. The foot of the Cliff: 先行 Those who walked before (week one).
6. Discord: the 測 Tester role becomes 先行 Forerunner after the switch, and onboarding stops offering it. It is self-assigned today, so it is a courtesy, never the record.

**Who qualifies, from data the server already has.**
- An account that is not banned and has **at least one `sync_log` row with `at < season_start()`, whatever its `ok`**. Every sync that reached the verifier writes a row (`index.ts` `log`); `ok` is the raw verdict, not the lenient one the closed test ranked on, so it is not used.
- `sync_log` is the evidence because it only grows (only `delete_me()` takes a player's rows). `standings` is overwritten at the first season sync, and `saves.closed_test` goes with Bruno's decision.
- `is_forerunner(uid)` is `p.forerunner or exists (select 1 from sync_log where user_id = uid and at < season_start())`. That one expression is right before Push B and after it, so no second switch is needed.
- Push A2 adds `profiles.forerunner boolean not null default false`. **Push B's first statement** sets it for every qualifying account, and only then deletes anything. A schema test holds that order, and `docs/SEASON0-PUSHB-DRAFT.md` is rewritten to say so (and to drop its "never delete `closed_test`" rule, which Bruno's decision reverses).
- The set is closed at the switch: nothing after 26 October 00:00 UTC can add to it.

**Bruno decides:**
- Whether his own account wears it (recommended: no).
- razielmorgenstern and rekaris wear it, because it means "was there".
- An account deleted with `delete_me()` before the switch has no rows and gets nothing.

**A guest who only played on a device.**
1. **Before the switch**, a one-time notice in the game for the last week, shipped in Push A on 19 October:
   > *The closed test ends on {local day and time} ({Monday 26 October, 00:00 UTC}). Season 0 then begins for everyone from the first realm, and no progress carries over. Join 榜 Ranks once before then (a guest only needs a name) and your name carries 先行 Forerunner, for good.*

   `{local day and time}` is formatted on the device (`toLocaleString`), so a player in Brazil reads "Sunday 25 October, 21:00". The 19 October announcement says "Monday 26 October, 00:00 UTC (Sunday 25 October in the Americas)".
2. **After the switch**, on that device only:
   - The card shows the farewell line from the kept summary.
   - Signed in: the card asks the server (`my_standing()` gains `forerunner`) and shows the Forerunner line if it is true, nothing if not.
   - Signed out: *"Joined Ranks before 26 October? Sign in, and your Forerunner mark is waiting."* It never says the server did not see them, because the device cannot know.
   - Nothing is shown on the boards: a save is input, and a mark from a device could be faked.
   - **Bruno's call, recommended yes:** the farewell summary may add one line to this player's own 碑 Stele, "Walked the closed test on this device", seen by nobody else. It is cosmetic, local and costs nothing, and it keeps "nothing is taken away for being away" true for someone who was simply not around in the last week.
   - No hand-added marks from screenshots: a screenshot proves nothing, and it would make Bruno a judge.

**Mark farming is accepted, on purpose.** A guest account made between 19 and 26 October qualifies. The stakes are cosmetic, and a cut-off at the announcement would shut out exactly the device-only players the notice invites.

### 2e. The season card's new words

The art stays: the painting with the cinnabar 九境 seal. The "Copy it" and "Save as a file" buttons go, and so does the Menu > Save "Closed test" section.

| Key | Text |
|---|---|
| over | Season 0 · Monday 26 October |
| name / han | The Founding / 開山 |
| line | The closed test is over, and its progress ends with it. |
| says | Everyone starts again from the first realm, and so do you. |
| farewell (summary kept) | Your closed-test cultivator reached {Realm name} (realm {r}), layer {n}. Its road ends here, under the seal. |
| law | 同 The season opens for everyone at the same second, in the first realm. · 驗 Every rank is checked from the first second. · 永 Nothing is wiped again. |
| forerunner (server says yes) | Your name now carries 先行 Forerunner on every board, for good. It changes nothing in the numbers. |
| signedOut | Joined Ranks before 26 October? Sign in, and your Forerunner mark is waiting. |
| cliff | The first 81 through each gate are carved on 題名崖 the Cliff of Names. |
| begin | Begin Season 0 |
| ranksTag | Season 0 · The Founding |
| `CLOSED_TEST_REFUSED` (in `src/sim/save.ts`) | That save is from the closed test, which ended on Monday 26 October. It cannot be loaded in Season 0. |

Removed: `kept`, `keptAccount`, `copy`, `file`, `copied`, `copyByHand`, `saved`, `noFile`, `later`, `notKept`, `notKeptYet`, `retry`, `oldHead`, `panelHead`, `panelNote`, `panelNoteAccount`, `signIn`, and the `SEASON` header comment ("sealed and kept"). `old()` stays as the formatter of the farewell line.

### 2f. What to build, and when

Every visual item comes with screenshots at 320, 400 and PC from the real app on fabricated saves (clock installed past `SEASON_START`, the faked Supabase from the client tests for the Forerunner answer), or a 樣 block in the bible.

**Push A, Monday 19 October (with the announcement and the trailer).**

| # | Item | Files | Size |
|---|---|---|---|
| 1 | Retire without a keepsake: at load after the switch, write the four-number summary to a small key, remove `KEY` and `BACKUP`, never write `ninefold.save.closedtest`; the frozen path ("no room to keep it") disappears; Begin clears the summary. The current retire-and-keep code must never reach `main`. | `src/sim/save.ts`, `src/net/closedtest.ts` (removed), `src/app/useCloud.ts`, `src/app/App.tsx`, `src/sim/season.ts` (header), `season.test.ts`, `closedcloud.test.ts` (mostly removed), `sync.test.ts`, CLAUDE.md trap paragraph | about a day |
| 2 | The season card and Menu > Save without the closed-test section | `SeasonCard.tsx`, `SEASON` in `copy.ts`, `SavePanel.tsx`, `theme.css` (scoped `.season0`), mockups | half a day |
| 3 | Last-week notice, local time | `src/app/notices.ts`, `src/app/ui/Notices.tsx`, copy | two hours. **Cannot slip:** useless after the switch. |
| 4 | Retire `closed_test_mine()` and `saves_keep_closed_test` before the switch (or the trigger starts copying rows into `closed_test` at 00:00) | new migration, `schema.test.ts`, `tools/ranked.ts` 90-96 (or the live attack fails the deploy), `src/net/cloud.ts` | two hours |
| 5 | 先行 on the boards: `is_forerunner()`; `drop function` and recreate `board()` and `samsara_board()` with `forerunner`, grants again; `my_standing()` gains it; the seal in `Ranks.tsx` (scoped `.ranks .rw .fore`) with its 註 note; the Account block | migration, `schema.test.ts`, `src/net/cloud.ts` types, `Ranks.tsx`, `RANKS` copy, `tools/ranked.ts` (an attack: an anon caller cannot set it) | half a day. Can slip a week: the evidence stays until Push B. |
| 6 | Announcement and devlog (`channel: devlog`, a new `key`), "closed test" footers in the guides | `tools/discord/server.json` | an hour |
| 7 | Docs: `SEASON0-BRIEF.md`, `SEASON0-PLAN.md`, `SEASON0-VOICE.md`, `SEASON0-PUSHB-DRAFT.md` say what Bruno decided | docs | an hour |

That is about three working days inside four, beside the trailer (section 4). If it does not fit, item 5 is the one that waits.

**Push A2, by Friday 23 October (hard date: live before 26 October 00:00 UTC).** A small `main` push with a one-line devlog note, as the release rule asks.
- **The carving record:** a `firsts (gate smallint, user_id uuid, at timestamptz, primary key (gate, user_id))` table and an `after insert or update` trigger `standings_carve()` on `standings` that does nothing before `season_start()` and inserts `on conflict do nothing` for every gate the new row has passed. About 40 lines of SQL, a schema test (silent before the switch, one row per gate, never rewritten), one attack in `tools/ranked.ts` (no client can write `firsts`).
- `profiles.forerunner` column (for Push B), and the `profiles.staff` flag if Bruno wants it.
- If this misses the 26th, the first arrivals are gone for good. The fallback is that the Spirit Fox column reads "Everyone" and carving starts when it lands, announced as such.

**Week one (nothing is lost by waiting; the arrivals are being recorded):**
- The Cliff, as a tab or sheet in Ranks: `cliff()` and its `cloud.ts` call; scoped CSS (`.ranks .cliff`, never a shared class); the painting heads; 先行 at its foot; `npm run han` and `npm run tips` reaching it, with a floor on what they count.
- The Stele line. The Discord guide post and its banner.
- The role change: a `was` alias in `tools/discord.mjs` (find the role by its old name, rename it) and a case in `tools/discord-check.mjs`, in a `main` push after the switch.

**Week two:** 第一期 The First Week panel.

**Push B:** sets `profiles.forerunner` first, then deletes, only with Bruno's named words.

**Confirm in writing before announcing:** D1. `docs/SEASON0-BRIEF.md:85` still says "Bruno confirms", and The Hundred (`docs/DRAWER.md:74-117`) is a 12-week fresh start. It must be an optional side life (option a). The Cliff and "for ever" are worthless without it.

---

## 3. What is said to players about the save

One sentence, everywhere (card, notice, announcement, trailer): **no progress carries over; your account and your name do.** The closed-test cultivator is read once on the device for its farewell line and removed. On the server it cannot be read by anyone from the first second of the season (`pullable()` refuses it, `closed_test_mine()` is gone) and it is deleted with Push B. Nobody is told it is deleted at the switch on the server, because until Push B it is not.

---

## 4. Trailer v6 storyboard (about 60 s)

**What stays from v5 A:** its look (ink black, bone silk, one red and gold leaf), its voice for lines 1, 2, 3, 5, 6 and 7 (the existing WAVs in `s0v5/vo-brian/`, not a new read), and its rules: no white hit flash, no red splatter, every shake 0.3 s or less.

**What changes:**
- **Music.** The v5 bed was written for one impact at 0:21 in 55 s (`s0v6/SUNO.md`). v6 needs a slam at 13.0, a drop at 27.3, chisel hits at 40.6 and a last chord near 58.9. Either re-edit the bed in `s0v6/audio/mix.sh` on its measured beat grid (`audio/beats.mjs`), or, better, Bruno makes a new instrumental in Suno from a v6 prompt with these timestamps (his plan is paid already, so it costs nothing new). The times below assume 92 BPM (one beat 0.652 s) and move with the measured grid.
- **Voice.** New lines 4, 9 and 8 (below). `voice.yml` regenerates every line of `tools/voice/lines.json`, so only 4, 8 and 9 are taken from the new run. `vo.sh` gets a ninth window.
- **Frames.** 1920x1080 captures of the real app in `shots/`; arena frames cropped to the fight card and pushed in.

**Four impact points:** the seal slam at 13.0, the montage drop at 27.3, the chisel hits from 40.6, the title stamp at 58.9.

| # | Seconds | Picture | Motion and sound | Text on screen | Voice (Mandarin · pinyin · English subtitle) |
|---|---|---|---|---|---|
| 1 | 0.0 to 4.0 | v5 shot A: the nine realm paintings as one handscroll | Unrolls, then a slow pan from realm 1 to 9. Low drone. | subtitle | **L1** at 0.8 (speech 2.9 s): 九重境界，一场试炼。 · Jiǔ chóng jìngjiè, yì chǎng shìliàn. · *Nine realms. One closed test.* |
| 2 | 4.0 to 9.5 | v5 shot B: four cultivators bloom onto the travelling scroll | Figures ink in as the scroll rides right to left. | subtitle | **L2** at 4.4 (4.7 s): 你亲手栽培的每一位修士，都曾在此一步步登攀。 · *Every cultivator you raised.* |
| 3 | 9.5 to 12.6 | v5 shot C: the scroll from above, colour draining, the seal's shadow descending | Slow descent; the music falls away at 12.2. | subtitle | **L3** at 9.7 (2.6 s), near a whisper: 此印，只落一次。 · Cǐ yìn, zhǐ luò yí cì. · *The seal falls once.* |
| 4 | 12.6 to 17.0 | v5 shot D, cut down: the slam, then the painting rolled, tied with its red cord and laid down | 0.4 s of silence; **SLAM at 13.0**: taiko and sub boom, a 0.25 s shake, gold leaf, no flash. From 14.4 the scroll rolls, is tied and laid aside: put away, not handed back. v5's "sealed and kept" title card is removed. | none | none |
| 5 | 17.0 to 22.5 | **The reworked season card**, shot after Push A item 2 on a fabricated qualifying account: `shots/seasoncard-founding-pc.png` (to shoot; `seasoncard-closedtest-pc.png` shows the old Copy and Save buttons and is never used) | Push in from the whole card to the 先行 Forerunner line; a soft gold glow on the seal at 20.6. | corner card: **先行 Forerunner · a mark, not a save** | **L4 (new)** at 17.3 (about 4.6 to 4.9 s): 试炼已毕，修为不留。先行之人，永记其名。 · Shìliàn yǐ bì, xiūwéi bù liú. Xiānxíng zhī rén, yǒng jì qí míng. · *The closed test is over. Nothing carries over. Those who came first are remembered, for good.* |
| 6 | 22.5 to 27.3 | v5 shot F, a brush stroke on new silk, matched into `shots/cultivate-r1-woman-pc.png` (realm 1, no aura yet) | One stroke, realm 1 bleeds in, match cut on the seated figure. The main theme returns on the cut. | at 25.5: **SEASON 0 · THE FOUNDING 開山** | **L5** at 22.6 (4.45 s): 新卷铺开。众生平等，皆从第一境起步。 · *A new scroll. Everyone starts equal, in realm 1.* |
| 7 | 27.3 to 36.4 | **The nine roads**: nine real screens, below | **The drop.** Each cut on a drum hit, its character pressed in cinnabar (a clean press, no splatter), a slow push in. Five cuts of two beats, then four of one beat. | one label per cut | none |
| 8 | 36.4 to 40.3 | `shots/dragon-tribulation-fight-pc.png` (2.2 s), then `shots/dragon-loss-nothing-lost-pc.png` (1.7 s), the same fixture | Cropped to the card, push in on the Dragon and the cultivator's violet ring. Cut to 再來 on a hit at 38.6. | **Losing a fight costs nothing.** | none |
| 9 | 40.3 to 45.5 | **題名崖 The Cliff of Names**, drawn in the trailer's own silk and ink (no game chrome): nine columns, each headed by its realm painting in ink with its warden's English name and character, the rows bare stone. If the real Cliff exists by the cut, use it, empty. Never a mock with names: on 19 October there are none. | Three chisel hits on the beat carve the first three heads, the other six follow in a run; each head takes its colour; the rows stay empty. | **題名崖 The Cliff of Names · the first 81 through each gate** | **L9 (new)** at 40.6 (about 4.4 s): 率先破关者，名刻山崖，永不磨灭。 · Shuàixiān pò guān zhě, míng kè shānyá, yǒng bù mómiè. · *The first through each gate are carved on the Cliff, for ever.* |
| 10 | 45.5 to 50.0 | v5 shot G: the real Rankings, every board empty | The brush waits over the first row. | subtitle | **L6** at 45.7 (4.1 s): 新榜虚位以待。名次皆验，全凭实力。 · *The boards start empty. Every rank is checked for fair play.* |
| 11 | 50.0 to 55.2 | **The aura match cut**: `cultivate-r1-woman-pc.png` (1.2 s), `survey-start.png` realm 5 gold (1.2), `cultivate-r7-man-pc.png` red with flying swords (1.2), `heaven-m12-pc.png` violet sphere (1.6) | Each crop centred on the figure at the same scale, cut on beats, a slow push across all four. Optional: re-shoot realm 7 as the woman with `tools/scenes.mjs` so one cultivator grows. | subtitle | **L7** at 50.1 (4.85 s), slower: 这是最后一次重来。从此，画卷永不抹去。 · *This is the last wipe. Nothing will be painted over again.* |
| 12 | 55.2 to 60.0 | v5 shot I, title card, new words | The title rises out of the silk; **the seal stamps on the last chord at 58.9**, a 0.18 s shake and gold dust. | **NINEFOLD 九境 · Season 0 · The Founding 開山 · Monday 26 October, 00:00 UTC**. Small line: *Played the closed test? Join Ranks before the 26th to be marked a Forerunner 先行.* | **L8 (re-take)** at 55.4 (about 3.4 s): 九境。开山。第零赛季。 · Jiǔjìng. Kāishān. Dì líng sàijì. · *Ninefold · The Founding 開山 · Season 0* |

**Shot 7, the nine roads, quantised to the beat (92 BPM: two beats 1.30 s, one beat 0.65 s):**

| Cut | Start | Beats | Frame (`shots/`) | Label |
|---|---|---|---|---|
| a | 27.30 | 2 | `breakthrough-r4-pc-0.png`, cropped to the upper third (化神 and the faint gold rings; the card text is unreadable at this length) | 突破 Break through |
| b | 28.60 | 2 | `z-warden-tiger-pc-b02.png` then `-b04.png` on the second beat (no white flash: never `warden-r4-pc-f0.png`, whose tiger is washed white) | 守 A warden at every gate |
| c | 29.91 | 2 | `secret-pc-room1.png` | 秘境 The secret realm |
| d | 31.21 | 2 | `gear-pc.png` (or `w-gear-wheel-r9-pc.png`) | 器 Gear and six schools |
| e | 32.52 | 2 | `crafts-pc.png` | 業 Seven crafts |
| f | 33.82 | 1 | `demon-pc-f1.png` | 心魔 Your own heart demon |
| g | 34.47 | 1 | `v-meet-road-pc-crop.png` (the ferryman) | 緣 Strangers on the road |
| h | 35.12 | 1 | `tower-pc-fight1.png` | 塔 A tower with no top |
| i | 35.78 | 1 | `awaken-r5-pc.png` | 悟道 Choose your enlightenment |

Shot 8 starts at 36.43. With the measured grid the cuts move a few hundredths; the order and the 2-then-1 rhythm stay.

**The voice, checked word by word.**

| # | Mandarin (simplified, for the tool) | Traditional | Pinyin | Word for word | Verdict |
|---|---|---|---|---|---|
| 4 (replaces the old 4) | 试炼已毕，修为不留。先行之人，永记其名。 | 試煉已畢，修為不留。先行之人，永記其名。 | Shìliàn yǐ bì, xiūwéi bù liú. Xiānxíng zhī rén, yǒng jì qí míng. | "The trial is finished; cultivation does not stay. Those who went first: their names remembered for ever." | Correct and natural in the literary register of lines 3 and 5. 修为不留 echoes 片甲不留 ("not a scrap left"), which is stark, but it is exactly "nothing carries over", which is what Bruno wants said. 先行之人 is "those who went first", not 先人 (ancestors, the dead). It avoids 封存, 原封不动 and 珍藏, the words that promised a keepsake. |
| 9 (new) | 率先破关者，名刻山崖，永不磨灭。 | 率先破關者，名刻山崖，永不磨滅。 | Shuàixiān pò guān zhě, míng kè shānyá, yǒng bù mómiè. | "Those who first break through the gates: names carved into the cliff, never worn away." | Replaces 首破守关者, which reads as one person ("the one who first breaks the gatekeeper") and says "warden", not "gate". 率先 is "among the first, taking the lead", fine for 81. 破关 is "break through a pass", and in cultivation also a bottleneck, which is the real condition. 永不磨灭 is a set phrase (an indelible mark). |
| 8 (re-take) | 九境。开山。第零赛季。 | 九境。開山。第零賽季。 | Jiǔjìng. Kāishān. Dì líng sàijì. | "Ninefold. The Founding. Season zero." | Correct. 开山 alone is read as founding a sect (开山立派) and also as cutting into a mountain; with the Cliff both readings help. 第零赛季 is the usual "Season 0". |

- **Delivery:** line 4 steady and warm, the plain fact first, a breath, then the honour; line 9 rising slightly, a breath at each comma; line 8 three separate words, as before.
- **Recording:** `tools/voice/lines.json` gets lines 4 and 8 replaced and a ninth line added; a push to the working branch runs `voice.yml` (ElevenLabs eleven_v4, Brian, free plan: "elevenlabs.io" in the video title). Only 4, 8 and 9 are kept from that run. Kokoro `zm_yunjian` is the fallback that is free for any use.
- **Taken out of v5:** the old line 4 ("kept as a copy you can save"), its subtitles (`s0v6/build.mjs` `SUBS`, the `[23.0, 29.0]` entry), and the title card's "The closed test is sealed and kept" (`build.mjs:413`).
- **Video title:** *Ninefold · Season 0 · The Founding 開山 · trailer (voice: elevenlabs.io)*.
- **Discord copy:** v5's Discord cut is already 9.87 MB at 55 s. Check the nine-road montage stays legible at 60 s under 10 MB; if not, post the 1080 copy elsewhere and link it.

**Still to shoot or draw:** shot 5 after Push A item 2 (a hard dependency on the branch, not on `main`); shot 9, a new trailer graphic in `build.mjs`; new text and stamps for shots 7 and 12; the music re-edit or new Suno take. Every other frame exists today and was opened for this check.

---

## 5. What was taken from each proposal, and what was left

| From | Taken | Left, and why |
|---|---|---|
| Founders | The name, the hook, the Cliff (81 per gate, server-dated, every arrival stored), the Forerunner mark (now 先行) and 先行 at the Cliff's foot, the Stele line, the First Week panel, the aura match cut, voice lines 4 and 8 | Hand-adding device-only veterans from screenshots; the one-glyph 先; "break the warden" as the carving rule |
| Lore | Realm paintings as the Cliff's heads, in ink until carved; the farewell line; the tied-scroll beat | The old man as the one who seals, and the "draft" framing |
| Law | The season law (同 驗 永), no seasonal qi modifier, the nine-road montage on the beat, the `sync_log` evidence rule (now without `ok`) with the Push B order, the last-week notice, the device-only card line, mark farming accepted on purpose | The 27 stamps, kept as the runner-up |

---

## 6. Runner-up, a real alternative: Season 0 · The Long Scroll 長卷

The choice if Bruno wants **no race at all**.

- **Hook:** *Everyone starts again. Fill your scroll.*
- **What it is:** a personal scroll of 27 stamps, three for each of nine systems, over the nine realm paintings. It pays nothing, never expires, has no dailies or streaks, and is derived from the save (seventeen are existing 碑 deeds). Measured (`law/measured.txt`): an active player has 3 stamps on day 1, 10 by day 7, 19 by day 30.
- **The mark:** the Law proposal's 初卷 First Scroll, or the same 先行 Forerunner, with the same qualification. If it is 初, it is two glyphs (初卷), never 初 alone: a lone character beside a name reads as a prefix to it.
- **Trailer:** the same structure, the Cliff shot replaced by the scroll, line 9 as 长卷一幅，二十七印，永无期限。 (Chángjuàn yì fú, èrshíqī yìn, yǒng wú qīxiàn. *One long scroll. Twenty-seven stamps. No deadline, ever.*), which reads correctly.
- **Why it is real:** safest on every rule, **no server date at all**, and its trailer is a feature tour.
- **What it gives up:** the public story and the drama Bruno asked for. Testers may read 27 items as chores.

---

## 7. Risks of the recommended package

1. **D1 in writing.** If any later season or The Hundred resets everyone, the Cliff and "for ever" are false. Do not announce the theme without it.
2. **The carving date.** Push A2 must be green before 26 October 00:00 UTC; the fallback is a Spirit Fox column that reads "Everyone".
3. **A race invites cheating.** Every arrival is stored and the read skips the suspect; a carving can still change after review, so the note says "checked".
4. **The race favours active play.** The copy never says "be first or miss out", and 81 places a column hold most of today's community.
5. **Carved at sync.** A player who has not joined Ranks is never carved. That is their choice, and the Cliff's note says so.
6. **Device-only veterans must join Ranks in the last week**, by their own clock. Expect a few complaints; the notice, the card line and the local Stele line are the honest answer.
7. **Push B order:** stamp the Forerunners, then delete. Schema-tested.
8. **Scope:** Push A is about three working days in four, beside the trailer. Item 5 (the board seal) is what waits; the Cliff screen is week one by design.
9. **Trailer:** shot 5 needs the reworked card on the branch; the music needs a re-edit or a new Suno take; shot 9 is a trailer graphic with no names.
10. **Mockups owed** before anything visual reaches `main`: the card (signed in, signed out, offline), the notice, a board row with 先行 at 320 px, and later the Cliff, at 320, 400 and PC.
