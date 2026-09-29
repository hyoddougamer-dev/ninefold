# 筆 The next devlog, drafted

What is ready on the working branch for the next release, and the words the players will
read. Nothing here is live: `main` moves only when Bruno has seen the changes and approved
this text. When it ships, the message goes into `tools/discord/server.json` as a devlog
entry with a new key (e.g. `update-2026-09-30`) in the same push.

## Ready on the branch

| Change | Player-facing | Status |
|---|---|---|
| 圍 Drive priced in minutes of your own gathering, old beasts a quarter | yes | ready, measured, tested |
| 郵 Sign-in email carries a 6-digit code | yes, once live | waits for the mail service (`SMTP_PASS`, `SMTP_SENDER`); do not announce before |
| 答 The bot answers testers' posts by name | no | already used from the branch |

The drive change also changes 驗 the server check (`src/sim/verify.ts` reads `driveFloor`),
so the release has to deploy the ranked server with it. The Supabase workflow does that on
a push to `main` that touches the sim.

## The message

**Title:** 圍 Update · The drive, repriced

**Body:**
A tester told us the drive was too expensive in qi. He was right, and late in the climb it was far worse than it looked.

**Fields:**

- **圍 The drive costs time now.** A drive used to cost a share of the layer you stood on, so late in the climb fifty kills cost more than a whole day of qi. It now costs one minute of your own gathering per kill, in every realm: 10 kills are 10 minutes, 50 are 50 minutes, 200 are 3h 20min. The price shows the time beside the qi.
- **舊 Old beasts for a quarter.** A beast from an earlier realm pays a quarter of what yours do, so driving it costs a quarter too. 200 Mountain Rats cost 50 minutes, which turns finishing the bestiary or a fate bar into a few drives instead of hundreds of taps.
- **量 What it does not change.** We measured it before changing it. The climb and the endgame take as long as they did, fighting one at a time is still free, and a drive still pays exactly what the taps would have.
- **謝 Thanks.** To Raziel, for saying it out loud. Keep them coming in {#bugs} and {#ideas}.

## The numbers behind it

Measured with `tools/habits.ts` and `tools/endgame.ts`, before and after:

| Cultivator | Climb (days) | Ninth realm (day) | Kills | 30 Dragon crossings (days) |
|---|---|---|---|---|
| active, never drives | 54.3 → 54.3 | 44 → 44 | 3,963 → 3,963 | 169 → 169 |
| active, drives | 52.0 → 54.7 | 44 → 45 | 3,990 → 5,104 | 175 → 175 |
| drives it all | 55.2 → 55.2 | 46 → 46 | 4,103 → 5,083 | 166 → 172 |
| once a day, drives | 82 → 82 | 68 → 68 | 929 → 1,009 | 187 → 189 |

What a drive of fifty cost before, in hours of the active cultivator's own qi: 2 in the
first realm, 8 in the fourth, 25 to 29 in the seventh to the ninth. Now 50 minutes
everywhere, 13 minutes on an older beast.
