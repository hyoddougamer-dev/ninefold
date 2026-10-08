/**
 * 驗 Whether a save could have been played honestly, in the time that really passed.
 *
 * Bruno, before the rankings: *"trabalha o anti cheat, deve ser forte, não queremos
 * cheaters."* The game is played on the phone and the sim runs there, so everything in a
 * save is something the phone says. A phone can be told anything: its clock moved on a
 * day, its storage edited to the ninth realm, its code changed. The one thing it cannot
 * move is **the server's clock**.
 *
 * So a ranked save is never believed, it is *bounded*. The server keeps the last save it
 * accepted and the server time it accepted it at. A new one is accepted only if every
 * gain between the two fits inside the seconds that really passed, spent at the best
 * rate this game allows anybody: the higher of the two saves' own rates, sitting 入定 at
 * its deepest the whole time, with every one-off payment in the game counted at its most
 * generous. A cultivator who plays perfectly for a week passes. Nothing faster can, by
 * construction, because nothing faster exists.
 *
 * What that buys, in one line each:
 *   - A clock moved forward earns nothing ranked. The phone banks it; the ranking waits
 *     for real time to catch up, and then it counts, because by then it is honest.
 *   - An edited qi, realm, level or kill count is a gain with no time to pay for it.
 *   - A beast or a floor the build cannot beat, a piece of gear from a realm not reached,
 *     a 道 point not earned: impossible whatever the clock says.
 *   - Going *down* (a restored older copy) is never a strike. It is just not progress,
 *     and the ranking keeps what it had.
 *
 * Pure, like the rest of sim/: two states and a number of seconds in, a verdict out. The
 * same file runs in the tests, in the harnesses, and in the server's sync function, so
 * the rule cannot be one thing on the phone and another on the server.
 */
import {
  BLESSED_ROOM, FOCUS_MAX, INCENSE_BONUS, INCENSE_WORTH, LAYERS, MARK_DAYS, MEET_GAP, MELT_CAP,
  MELT_FILL, PAIR_BOUNTY, PAIR_DRAGON, PAIR_MELT, PAIR_SPRING, PAIR_TOWER_QI, PLATFORM_EDGE,
  ROUND_CAP, SEAL_PAY_SHARE, SECLUSION, SPRING_FILL, SPRING_HOLD, TOWER_QI_SUMMIT, TRAIL_WOUND, TRIBULATION_CHALLENGE,
} from './balance.ts';
import { WEEK } from './week.ts';
import { beatenNow, challengerOf, challengerQi, platformEdge, type Tier } from './platform.ts';
import { classSpring, classTower, classTowerQi } from './schools.ts';
import {
  UPGRADES, UPGRADE_INFO, capOf, gathering, heavenStep, layersOpened, power, sealDays, sealLeft, tribulationScale, upgradeCost,
  newState, wardenStands, type State,
} from './state.ts';
import { echoFactor, livesExtend } from './echo.ts';
import { bornFrom } from './rebirth.ts';
import { layerCost } from './time.ts';
import { beastPower, beatable, quarryQi, seenBounty } from './combat.ts';
import { heavensOpened } from '../data/heavens.ts';
import { meetingOf } from '../data/meetings.ts';
import { DOOR_GAP, RUN_DAO_CEILING } from '../data/secret.ts';
import { CAPSTONE_TIER, capstonesOpen, focusBonus } from './dao.ts';
import { NODE_BY_KEY } from '../data/techniques.ts';
import { freePoints } from './points.ts';
import { driveFloor } from './hunt.ts';
import { XP_PER_SECOND_MAX, bestFeed, carriedXp, bestKit, bestUnseal, shortestDoorGap } from './crafts.ts';
import type { Kit } from './kit.ts';
import { RECIPE_BY_KEY, SKILL_KEYS } from '../data/crafts.ts';
import { floorBeast, floorPower, floorQiPay } from './tower.ts';
import { forkTrees } from './fork.ts';
import { wearSet } from './sets.ts';
import { pillCost } from './furnace.ts';
import { LINES } from '../data/alchemy.ts';
import { BEASTS, wardenOf } from '../data/bestiary.ts';
import { SLOTS, TEMPLATE_BY_KEY, templateOf, type Item } from '../data/gear.ts';
import { equip } from './chest.ts';
import { codexToKeep, hundredFits, keptCovers } from './hundred.ts';

/**
 * 始 No save can have begun before the game existed, so a first sync is measured from
 * here at the earliest: the day this repository's first commit was made.
 */
export const GAME_EPOCH = Date.UTC(2026, 0, 18) / 1000;

/**
 * 初 How much play from before the account existed a first sync may be credited with.
 *
 * The first version believed the save's own `startedAt`, and a guest signed up a second
 * ago could send a save that said it began the day the game did and take first place on
 * its first sync, verified and not even flagged. The server knows when the account was
 * made. A save may claim three days of play from before that, which covers the tester who
 * plays a weekend before joining; anything beyond waits, as a clock moved on does, until
 * real time has caught up with it. Nothing is lost by waiting.
 */
export const PRE_JOIN_CREDIT = 3 * 86_400;

/**
 * 初 And what a first sync may claim of that time: no burst on top, and no more than this
 * share of it at the best rate there is. The budget is the fastest *possible* player, and
 * the harness's own active cultivator needs about a third of it, so three days at the
 * full budget held twenty days of honest play. A first sync is the one moment there is
 * nothing on the server to compare with, so it is held to a pace the fastest honest
 * cultivator measured could keep; anything more waits and counts later. It stayed at
 * 0.55 when SUSPECT_WEEK came down under it: a first sync waiting is a cost to an honest
 * newcomer, and the week behind it still flags a fast clock.
 */
export const FIRST_PACE = 0.55;

/**
 * 坐 And one sitting on top of it, once. FIRST_PACE is a pace for days, and a first sync
 * that comes after twelve minutes is not a day: it is somebody playing with the game in
 * front of them, where qi runs three times over (FOCUS_MAX) and every first sight pays.
 * Measured on the live server, 2026-09-30: 195 of 591 syncs were held back as too fast,
 * and replaying an honest new player showed why: every first sync of the first half hour
 * was refused, at up to four times the allowed pace, so nobody who tried the game ever
 * saw their name on a board in the sitting they tried it in. An hour of credit covers
 * that sitting. It is worth an hour of a climb of fifty-five days to whoever would forge
 * it, and it is spent once, on the first sync.
 */
export const FIRST_SITTING = 3600;

/** 餘 Room for rounding and for a rate that dipped mid-interval (a piece taken off). */
export const SLACK = 1.15;

/**
 * 爆 How far a short gap may run ahead of its own seconds, for the payments that arrive
 * all at once, and the most that can ever be in hand that way.
 */
export const BURST = 2.5;
export const BURST_CAP = 12 * 3600;

/**
 * 疑 The fastest the harness's own cultivators ever went, needed seconds per real second,
 * with room on top. Faster than that is flagged, never struck.
 *
 * 得 Measured again on 2026-10-05, when the lumps (the floors, the quarry, the Platform,
 * the first sights) went into the pocket as qi instead of seconds at the end's rate
 * (see verify). Every habit walked 120 days, the peak over any day and any week:
 *
 *   habit            day     week   | clock ×2: day   week | clock ×3: day   week
 *   active           0.49    0.30    |           0.87   0.37 |           1.22   0.37
 *   every hour       0.70    0.34    |           1.21   0.36 |           1.57   0.34
 *   drives it all    0.49    0.29    |           0.85   0.36 |           1.20   0.38
 *   crafts it all    0.47    0.29    |           0.87   0.37 |           1.19   0.37
 *   walks 神         0.39    0.24    |           0.67   0.30 |           0.92   0.31
 *   once a day       0.44    0.32    |           0.83   0.43 |           1.20   0.47
 *   runs auto        0.58    0.30    |           1.00   0.34 |           1.40   0.33
 *
 * The real testers' saves read under it too: 0.55 over 34 hours at the most (the
 * ranked-read of 2026-10-05). The day's line is 0.9, nearly a third above the fastest
 * honest day, because a person who knows the game well beats the harness by a margin the
 * harness cannot show (rekaris, Discord: "AI agents tend to be very bad at giving you
 * accurate data"). The server reads a day as it rolls its anchors, not at the peak, and
 * there the active cultivator's clock run three times as fast reads 0.997 at the most:
 * 1.0 would have been a knife edge, 0.9 catches it with a tenth to spare. The
 * week's is 0.40, a fifth above the fastest honest week. A week now catches less than it
 * did, because what made a fast clock's week stand out was mostly the lumps it was paid
 * in seconds; the day catches what the week no longer does.
 *
 * The old lines (1.6 and 0.49) read the floors as seconds at the fastest rate there was
 * and the layers they opened at each layer's own: an honest Celestial Master who climbed
 * ten floors and opened seven layers in nine minutes read as a sprint and was kept off
 * the boards.
 */
export const SUSPECT_DAY = 0.9;
export const SUSPECT_WEEK = 0.40;

/** 擊 The fastest a hand can take fights one after another: a fight is at least this long on the screen. */
export const MIN_FIGHT_SECONDS = 1.2;

export type Why =
  | 'went-down'      // not progress; never a strike
  | 'too-fast'       // gained more qi than the time allows
  | 'too-many-kills' // more fights than the time allows, and not paid for as drives
  | 'warden'         // broke through a realm whose warden this build cannot beat
  | 'tower'          // a floor this build cannot beat
  | 'gear'           // a piece from a realm not reached
  | 'dao'            // more 道 spent than earned
  | 'anchor'         // the Dragon's anchor shrank: edited to make the next crossing easy
  | 'road'           // an answer given on the road was changed afterwards, to take a boon
  | 'codex'          // a kept codex no life left: in a first life, or grown without a rebirth
  | 'shape'          // another run of the game than the one verified (startedAt); never a strike
  | 'newrun';        // a run of its own far past the account's last verified save (sync core); review, never a strike

export interface Verdict {
  readonly ok: boolean;
  readonly why: readonly Why[];
  /** How much of the time budget the gains used. Above 1 is too fast. Kept for the record. */
  readonly used: number;
  /** A cheat, as opposed to a restore or a second device: counts toward a player's strikes. */
  readonly strike: boolean;
  /**
   * Seconds the gains needed at the best rate, per second that passed, with the lumps the
   * game paid at once (floors, the quarry, the Platform) already in the pocket: the pace
   * SUSPECT_DAY and SUSPECT_WEEK read.
   */
  readonly pace: number;
  /** Faster than any honest cultivator measured, over a day or more: flagged for review. */
  readonly suspect: boolean;
}

const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);
const kills = (s: State) => sum(Object.values(s.killed));

/**
 * What the qi-priced levels bought between the two cost, level by level, in the cheapest
 * body either save holds (what is worn, or a loadout).
 *
 * 誤 It priced them in what the later save wore until 2026-10-05. 氣 The Qi school buys
 * upgrades cheaper, and putting its loadout on to buy and the climbing one back after is
 * honest play, so a Celestial Master who did just that was charged a tenth more than they
 * paid and waited (rekaris, Discord).
 */
function levelsBetween(a: State, b: State): number {
  const bodies = [b, ...b.sets.map((_, i) => wearSet(b, i).state), a, ...a.sets.map((_, i) => wearSet(a, i).state)];
  return Math.min(...bodies.map((body) => {
    let q = 0;
    for (const u of UPGRADES) {
      if (UPGRADE_INFO[u].currency !== 'qi') continue;
      for (let l = a.levels[u]; l < b.levels[u]; l++) {
        q += upgradeCost({ ...b, worn: body.worn, levels: { ...b.levels, [u]: l } }, u);
      }
    }
    return q;
  }));
}

/**
 * 階 The rate a save's own build would give standing on rung `n`, with only what could
 * have been owned there.
 *
 * 誤 The first version stood the *finished* build on the first rung, and a ninth-realm
 * cultivator's sixty levels of 功法 paid for the first realm in minutes. None of that was
 * ownable there: every level is capped by the realm it is bought in, a piece of gear
 * falls no earlier than its own realm, and 雷印 the marks only exist at the summit.
 */
function rateOn(s: State, n: number): number {
  const realm = Math.floor(n / 9) + 1;
  const probe: State = { ...s, realm, layer: n % 9, tribulation: n >= LAYERS - 1 ? s.tribulation : 0 };
  const levels = { ...s.levels };
  for (const u of UPGRADES) levels[u] = Math.min(levels[u], capOf(probe, u));
  const worn = Object.fromEntries(Object.entries(s.worn)
    .filter(([, x]) => x && (templateOf(x as Item)?.realm ?? 1) <= realm)) as State['worn'];
  // 宿慧 What is gathered, the Echo included: a claimed record raises this by ECHO_CEILING at most.
  return gathering({ ...probe, levels, worn });
}

/**
 * 丹 The qi the pills brewed between two saves cost. Summed pill by pill, because every
 * pill costs more than the last; a forged thousand comes to more qi than a lifetime.
 * Priced at the marks the earlier save had, which is the cheapest any of them could have
 * been (PILL_AHEAD only ever holds a price down), so an honest save is never charged
 * more than it paid.
 */
function pillsBetween(a: State, b: State): number {
  let q = 0;
  for (const line of LINES) {
    for (let n = a.brewed[line]; n < b.brewed[line]; n++) {
      q += pillCost({ ...b.brewed, [line]: n }, line, a.tribulation).qi;
      if (!Number.isFinite(q)) return q;
    }
  }
  return q;
}

/**
 * 劫 The least the Dragon's anchor can be after these marks. Every crossing sets it at
 * least to the Dragon that fell, which stood TRIBULATION_CHALLENGE above the anchor
 * before it (or on the ladder, if that was higher), and a heaven opened multiplies it by
 * what the new room is worth. The even-odds reading can only ever raise it further, so
 * this is a floor an honest crossing always clears.
 *
 * 劍聖 The Dragon that fell is the one the cultivator met, and a Sword Saint meets it at
 * PAIR_DRAGON of itself, so that is the least it is counted as here. The server cannot
 * know which body crossed; allowing every body the Saint's share eases the floor by that
 * share a crossing, and the anchor still grows by TRIBULATION_CHALLENGE times it.
 */
export function anchorFloor(before: State, marks: number): number {
  const base = beastPower(wardenOf(9));
  const met = Math.min(1, PAIR_DRAGON);
  let at = before.tribulationAt;
  for (let m = before.tribulation; m < marks; m++) {
    const dragon = Math.max(base * tribulationScale(m), at * TRIBULATION_CHALLENGE);
    const step = heavensOpened(m + 1) > heavensOpened(m) ? heavenStep() : 1;
    at = Math.max(at, dragon * met) * step;
  }
  return at;
}

/**
 * 龕 From this instant (seconds) the vault's 道 is read from vaultDao, which counts exactly
 * what the shrines paid since SHRINE_DAO_PER_REALM capped them on 2026-10-03. A save from
 * before it, or a phone still running the old build for a day or two, paid shrines without
 * counting them, so a pair that starts earlier keeps the walk-by-walk ceiling below.
 */
export const DAO_BANK_STRICT_FROM = 1_791_158_400; // 2026-10-05T00:00:00Z

/**
 * 塔 The most qi the floors climbed between two saves could have paid.
 *
 * 誤 A tester found it (2026-10-04): the tower opens at the fifth realm, every floor
 * below the cultivator's strength falls in a few minutes, and each one pays a lump. The
 * floors were left to the burst allowance, which is a few minutes against a sync five
 * minutes long, so the climb waited, and against the day behind it the pace read as
 * faster than anybody honest: flagged, for the game's own payment. Each floor is a fight
 * the save has to be able to win (towerVerdict), so its pay is allowed for as itself.
 *
 * A floor pays a fixed sum read off the floor alone (floorQiPay in tower.ts, 2026-10-05),
 * 天師 the Celestial Master PAIR_TOWER_QI times it, so this is no longer a ceiling guessed from
 * the realms and the rates between two saves: it is the sum itself, every new floor at
 * the Master's pay. A phone still on the build before 2026-10-05 paid some floors more
 * than this (its own hours), and waits a little.
 */
export function towerQi(before: State, after: State, first: boolean): number {
  // A first sync has its own allowance (FIRST_PACE, FIRST_SITTING), and a month of floors
  // brought to it would buy a month of anything else.
  if (first) return 0;
  const lo = Math.max(0, Math.floor(before.tower));
  const hi = Math.max(lo, Math.floor(after.tower));
  // Every floor above the summit floor pays what it does, so those are counted at once:
  // an edited save claiming a billion floors is one multiplication, never a billion steps.
  const flat = Math.min(hi, Math.max(lo, TOWER_QI_SUMMIT));
  let qi = Math.max(0, hi - flat) * floorQiPay(TOWER_QI_SUMMIT);
  for (let f = lo + 1; f <= flat; f++) qi += floorQiPay(f);
  return qi * (wearsMaster(before) || wearsMaster(after) ? PAIR_TOWER_QI : 1);
}

/**
 * 天師 Whether a save wears the Celestial Master, or holds a loadout that does. The Master's
 * pay is PAIR_TOWER_QI times a floor's, so crediting it to every save would leave a cheat
 * all of the difference as room. Six loose pieces in the chest were
 * enough in the first reading (the audit of 2026-10-05), so only what is worn and what a
 * loadout puts on count; a save that does neither at either end of the window is credited
 * a floor's own pay. Measured on an honest Master with the Arts half taken off both ends of
 * every window: no wait, no flag.
 */
export function wearsMaster(s: State): boolean {
  if (classTowerQi(s) > 1) return true;
  return s.sets.some((_, i) => classTowerQi(wearSet(s, i).state) > 1);
}

/** 道 The most 道 the road and the vault could have paid between two saves. */
function metCeiling(before: State, after: State, dt: number, first = false): number {
  const road = after.met.filter((k) => !before.met.includes(k)).reduce((n, k) => {
    const m = meetingOf(k);
    return n + (m ? Math.max(0, ...m.picks.map((p) => (p.outcome.kind === 'dao' ? p.outcome.points : 0))) : 0);
  }, 0);
  // 2026-10-03 audit: a walk's RUN_DAO_CEILING per possible walk let one twenty-second sync
  // bank 96 points, the whole tree, while an honest climb now earns 27 from shrines at most.
  if (!first && before.at >= DAO_BANK_STRICT_FROM) {
    return road + Math.max(0, (after.vaultDao ?? 0) - (before.vaultDao ?? 0));
  }
  // 秘門 The Hidden Door Array opens the door sooner, so a save holding one is read at its
  // gap, and at the array's deepest step (CRAFT_ARRAY_DEPTH_TOP): the depth is the save's
  // own claim, so the server allows the most it can honestly be.
  const gap = shortestDoorGap(after.crafts.pouch, DOOR_GAP);
  // 鑰 And a Realm Key can open it once more a day: see useKey in sim/secret.ts.
  return road + (Math.ceil(Math.max(0, dt) / gap) + Math.ceil(Math.max(0, dt) / 86_400) + 2) * RUN_DAO_CEILING;
}

/**
 * 封 Room for a phone's clock a little ahead of the server's, on a seal read in real seconds.
 */
export const SEAL_GRACE = 3600;

/**
 * 封 From this instant (seconds) a sealed gate crossed is read against its days. The game
 * before the seal had none: its warden could be fought the moment it came out, so a save
 * from before then crossed realms 5 to 8 honestly without the days or a pill. A pair that
 * starts earlier is never charged for a seal.
 *
 * Two days after the release of 2026-10-08, as DAO_BANK_STRICT_FROM sat two days after the
 * shrines changed: a phone still running the old build (a cached page, an APK not updated
 * yet) crosses a gate the old way, and is not charged for it while most of them catch up.
 * One that is still old after this waits the seal out on the server, SEAL_DAYS at the most
 * per gate, never a strike, and it clears by itself as the hours pass (the rankings card
 * says how far ahead of real time the climb is). The margin costs nothing honest: the new
 * game keeps the gate shut itself, so only an edited one could cross it early meanwhile.
 * If the release moves later, this moves with it.
 */
export const SEAL_STRICT_FROM = 1_791_590_400; // 2026-10-10T00:00:00Z

/**
 * 擂 From the same instant a Platform challenger beaten is read at the realm's grown edge
 * (platformEdge, released with the seal). Before it, and on a phone that had not updated
 * yet, every challenger stood at the flat PLATFORM_EDGE, and a third one beaten there in
 * the seventh realm or above may be one the grown edge says no body could take: read at
 * the grown edge, that save would wait until the period turned, a week at the most.
 */
export const EDGE_STRICT_FROM = SEAL_STRICT_FROM;

/**
 * 封 The real seconds the sealed gates crossed between two saves must have stood shut, at
 * the least. Each gate's bar is SEAL_DAYS of time, less everything an honest cultivator
 * could have put into it: the Breakthrough Pill made for that realm, which this save's
 * Alchemy reached or not, breaks the whole bar (bestUnseal); otherwise qi fills up to
 * SEAL_PAY_SHARE of it, and lesser pills up to SEAL_PILL_SHARE where Alchemy reached one
 * (bestFeed). The server sees a gate crossed, never what was paid into it, so it allows the
 * most that can honestly be, as it does for the kit. A gate the earlier save already stood
 * at owes only what was left of its bar then (its own fills counted); one it had not
 * reached owes all of it. A save from before the bar has no fills and is read the same.
 */
export function sealSeconds(before: State, after: State): number {
  let days = 0;
  for (let r = before.realm; r < Math.min(9, after.realm); r++) {
    const whole = bestUnseal(after, r);
    const bar = after.sealPaid !== undefined || after.sealFed !== undefined;
    const qi = bar ? SEAL_PAY_SHARE * sealDays(r) : 0;
    const lesser = bar ? bestFeed(after, r) : 0;
    if (r === before.realm && before.wardenFell) continue;
    if (r === before.realm && wardenStands(before)) {
      // What the earlier save had already put in is inside sealLeft; allow only the rest.
      const more = Math.max(0, qi - Math.max(0, before.sealPaid ?? 0) / 86_400)
        + Math.max(0, lesser - Math.max(0, before.sealFed ?? 0) / 86_400);
      days += sealLeft(before, whole > 0 ? whole : more);
    } else days += Math.max(0, sealDays(r) - (whole > 0 ? whole : qi + lesser));
  }
  return days * 86_400;
}

/** 業 The seconds of work the experience gained between two saves took, at its fastest. */
export function craftSeconds(before: State, after: State): number {
  let t = 0;
  for (const k of SKILL_KEYS) {
    const gain = Math.max(0, (after.crafts?.xp[k] ?? 0) - (before.crafts?.xp[k] ?? 0));
    t += gain / XP_PER_SECOND_MAX[k];
  }
  return t;
}

/** Every piece the save holds must come from a realm the cultivator has stood in. */
function gearFits(s: State): boolean {
  // 圍 And a drive's pieces on the table, which fell in the realm the save stands in.
  const all = [...Object.values(s.worn), ...s.chest, ...(s.pile ?? [])].filter(Boolean) as Item[];
  return all.every((x) => (templateOf(x)?.realm ?? 1) <= s.realm);
}

/**
 * 驗 The verdict. `before` is the last save the server accepted, `after` the one being
 * offered, `seconds` the server time between them. For a first sync, pass
 * `firstSync(after, now)` as `before`.
 */
/**
 * `held` is the highest floor the server has already ranked for this account. A floor at
 * or under it was won and checked once, so it is never read again: since 2026-10-05 the
 * floors past the Dragon's stand harder (TOWER_PAST_DRAGON), and a floor a cultivator won
 * before that, brought back on a new device, must not wait for a fight it already won.
 */
export function verify(before: State, after: State, seconds: number, first = false, held = 0): Verdict {
  const why: Why[] = [];
  const dt = Math.max(0, seconds);

  if (after.startedAt !== before.startedAt) why.push('shape');

  // 轉世 A life that ended since the last save: measured as the new life it began. See reborn().
  const born = (after.lives?.length ?? 0) > (before.lives?.length ?? 0);
  if (born && livesExtend(before.lives, after.lives) && !why.includes('shape')) return reborn(before, after, dt, first);

  // 下 Anything that can only ever grow, having shrunk, is a restore or a second device.
  // 世 And a record of lives that lost one, or that is not the record it was (two copies of
  // one cultivator each reborn their own way), is another copy, never a strike.
  const down = !livesExtend(before.lives, after.lives)
    || layersOpened(after) < layersOpened(before)
    || after.tribulation < before.tribulation
    || after.tower < before.tower
    // 擂 Every challenger ever beaten: a count that only grows.
    || (after.bouts ?? 0) < (before.bouts ?? 0)
    || after.demons < before.demons
    // 鑰 The day the last Realm Key turned only moves forward.
    || (after.keyDay ?? 0) < (before.keyDay ?? 0)
    || UPGRADES.some((u) => after.levels[u] < before.levels[u])
    // Commons only: a warden's count is a marker the arts read, not a tally that pays.
    || BEASTS.some((b) => !b.warden && (after.killed[b.key] ?? 0) < (before.killed[b.key] ?? 0))
    // 承 The codex the lives before kept only grows, and only at a rebirth.
    || !keptCovers(after.codexKept, before.codexKept);
  if (down) why.push('went-down');
  // 承 And a kept codex is something only a life that ended can leave: one in a first life,
  // or one that grew while the record of lives stayed what it was, was written by hand.
  // validate() already empties the first, so the server only meets it unvalidated.
  if ((after.lives?.length ?? 0) === 0 ? (after.codexKept?.length ?? 0) > 0
    : !down && !keptCovers(before.codexKept, after.codexKept)) why.push('codex');

  // 時 The budget, in seconds. What the best possible player would have needed to make
  // these gains, against the seconds that really passed.
  //
  // Every layer is paid at the best rate anybody could have had *on that layer*: the
  // higher of what the two saves' upgrades, gear and tree give, standing on that rung,
  // sitting 入定 at its deepest. A rate is never borrowed from the future: the first
  // version paid the early layers of a long gap at the rate of its end, and a ninth
  // realm cultivator's rate pays for the first eight realms in an afternoon.
  const focus = FOCUS_MAX + Math.max(focusBonus(before.unlocked), focusBonus(after.unlocked));
  const rateAt = (n: number) => Math.max(rateOn(before, n), rateOn(after, n)) * focus;
  const from = layersOpened(before);
  const to = Math.max(from, layersOpened(after));
  const rEnd = rateAt(Math.min(to, LAYERS - 1));
  const newKills = Math.max(0, kills(after) - kills(before));
  const handFights = dt / MIN_FIGHT_SECONDS;
  const drove = Math.max(0, newKills - handFights);

  // 得 The lumps the game pays at once: the week's quarry, a first sight, each challenger
  // beaten and every floor climbed. Each is a fixed sum of qi, so each goes into the pocket as qi, and the
  // layers it opened cost no time at all.
  //
  // 誤 They were credited as seconds at the fastest rate there was (the end's) until
  // 2026-10-05, while the layers they paid for were charged at each layer's own, slower
  // rate. A floor's qi spent on the layers just above it was therefore read as several
  // times more seconds than it had been credited, and an honest Celestial Master who
  // climbed ten floors and opened seven layers with what they paid, in nine minutes, read
  // over a day as a sprint past SUSPECT_DAY and was kept off the boards (rekaris, Discord).
  //
  // 期 The quarry: QUARRY_HOURS of the realm's middle rate, 金剛 the Vajra's half again at
  // most, the week it is first taken, read off the higher realm of the two saves.
  const top = Math.max(before.realm, after.realm);
  const quarry = (after.quarryWeek ?? 0) > (before.quarryWeek ?? 0)
    ? Math.max(0, ...BEASTS.filter((b) => !b.warden && b.realm <= top).map((b) => quarryQi(top, b))) * PAIR_BOUNTY : 0;
  // 見 Every beast seen for the first time paid its first sight, the Vajra's half again at
  // most. It hid inside BURST until 2026-10-05, which a new realm's five first sights in
  // one sync outgrow.
  // A first sync has its own allowance, and only a beast of a realm the save stands in counts.
  const seen = first ? 0 : BEASTS
    .filter((b) => b.realm <= top && !(before.killed[b.key] ?? 0) && (after.killed[b.key] ?? 0) > 0)
    .reduce((q, b) => q + seenBounty(b) * PAIR_BOUNTY, 0);
  // 塔 The floors: the fixed sum of every floor between the two saves, the Master's when
  // either save wears one (towerQi). Each is a fight the save has to be able to win
  // (towerVerdict, below), so the sum is exact rather than a ceiling.
  const tower = towerQi(before, after, first);
  // 擂 The Platform: each challenger beaten paid a fixed sum read off the realm, the third's
  // at most and the Vajra's half again at most. A first sync has its own allowance.
  const bouts = Math.max(0, (after.bouts ?? 0) - (before.bouts ?? 0));
  const platform = first ? 0 : bouts * challengerQi(top, 2) * PAIR_BOUNTY;

  // 岔 A fork swapped for its twin inside the window leaves no trace in either save, so the
  // layers are priced on the cheapest tree the save could have stood on (sim/fork.ts).
  const layerTrees = forkTrees(after.unlocked);
  let pocket = before.qi + quarry + seen + tower + platform;
  let need = 0;
  for (let n = from; n < to && n < LAYERS - 1; n++) {
    const cost = Math.min(...layerTrees.map((t) => layerCost(Math.floor(n / 9) + 1, n % 9, t)));
    need += Math.max(0, cost - pocket) / rateAt(n);
    pocket = Math.max(0, pocket - cost);
  }
  // What is spent or held at the end is paid at the end's own rate, the fastest there was.
  const spentAtEnd = after.qi
    + levelsBetween(before, after)
    + pillsBetween(before, after)
    + (drove > 0 ? driveFloor(before, Math.ceil(drove)) : 0);
  need += Math.max(0, spentAtEnd - pocket) / rEnd;
  // 雷 A thunder mark is 雷池 the pool filled: MARK_DAYS of the cultivator's own gathering,
  // however deep the 入定. It used to be charged as qi and divided by the rate at the end,
  // which already counted every new mark's multiplier, so the more marks were forged the
  // cheaper each one got: 300 at once verified in thirty seconds. It is time, so it is
  // counted as time.
  const newMarks = Math.max(0, after.tribulation - before.tribulation);
  // 宿慧 The Echo fills the pool faster, by ECHO_CEILING at the most.
  need += newMarks * markSeconds(before, after, focus);
  // 塔 And every floor climbed is a fight, fought at a hand's pace at best.
  need += Math.max(0, after.tower - before.tower) * MIN_FIGHT_SECONDS;

  // 得 One-off payments (a tower floor's fixed sum at once, a meeting's reward) arrive in
  // bursts, so a short gap can hold more than its own seconds. They are allowed for as a
  // burst on top of the real time: BURST times the gap, never more than BURST_CAP. A
  // burst bigger than that is not refused for ever, only until real time catches up: the
  // server keeps measuring from the last save it accepted, so the gap grows until it
  // pays. What cannot happen is a long gap going faster than the fastest honest one.
  //
  // 拆 And melting pays qi beside the gathering, out of its own allowance: MELT_CAP to
  // start and MELT_FILL of a standing second for every second, 寶匠 the Treasure Smith's
  // faster fill at most. It used to fit only inside SLACK, and raising MELT_FILL on
  // 2026-10-03 left the Treasure Smith past that margin, so it is counted as itself now,
  // in the same deep-sitting seconds as the rest of the budget.
  const melted = (MELT_CAP + dt * MELT_FILL * PAIR_MELT) / focus;
  // 泉 The vault's spring fills with time and nothing else: a day held, plus what dt could
  // fill, each second of it worth at most INCENSE_WORTH (burned rather than drunk), the
  // week's blessed room and 尋仙 the Immortal Seeker's deeper draught. It used to hide inside
  // BURST; counted as itself it is independent of how many runs were walked, so the door
  // gap, the Realm Key and the Hidden Door Array need no qi term at all. A first sync has
  // its own allowance (FIRST_PACE, FIRST_SITTING), as for the floors.
  const spring = first ? 0 : vaultSeconds(dt) / focus;
  const have = (first ? dt * FIRST_PACE + FIRST_SITTING : dt + Math.min(dt * BURST, BURST_CAP)) + melted + spring;
  const used = need / Math.max(1, have * SLACK);
  if (used > 1) why.push('too-fast');

  // 擊 Fights beyond a hand's pace that the qi could not have bought as drives.
  // Measured without what the drives themselves could have dropped, or a million edited
  // kills would pay for their own drives in melted gear.
  if (drove > 0 && driveFloor(before, Math.ceil(drove)) / rEnd > have * SLACK) why.push('too-many-kills');

  // 守 Every realm crossed had a warden in the way, and this build has to be able to beat it.
  // 業 With the strongest kit this cultivator's crafts could have carried into it: the
  // server sees the warden beaten, never what was in the other hand.
  for (let r = before.realm; r < after.realm; r++) {
    const w = wardenOf(r);
    // 瓶頸 Read fully loosened: a gate waited out is as honest as one built through, and
    // the server cannot see the days in between.
    const there = { ...after, realm: r, layer: 8, gateAt: 1 };
    if (!beatable(there, w, undefined, bestKit(there, w, 'warden'))) { why.push('warden'); break; }
  }
  // 封 And every sealed gate crossed stood shut for its days, less what a Breakthrough Pill
  // this save's Alchemy could have made counts as, and the share of its bar that qi and lesser
  // pills can fill (SEAL_PAY_SHARE, SEAL_PILL_SHARE: see sealSeconds; a loosening, so it needs
  // no grandfathering, and a save without the bar's fields is read as it always was). Time is
  // the honest way through it, so a seal crossed too soon is a matter of time and waits, like
  // a clock moved on. A pair from before the seal existed (SEAL_STRICT_FROM) owes it nothing.
  if (before.at >= SEAL_STRICT_FROM && sealSeconds(before, after) > dt * SLACK + SEAL_GRACE && !why.includes('too-fast')) {
    why.push('too-fast');
  }
  // 業 One task at a time, so the experience every craft gained between two saves has to
  // fit in the seconds between them, at the fastest each one can ever be worked.
  if (dt > 0 && craftSeconds(before, after) > dt * SLACK + 60 && !why.includes('too-fast')) why.push('too-fast');
  // 劫 Every mark is a Dragon beaten, and the last one has to be beatable by this build.
  //
  // 誤 It stood on the wrong anchor until 2026-10-04: `after` carries the anchor the
  // crossing left, which is what the *next* Dragon stands on, at least TRIBULATION_CHALLENGE
  // above the one that fell. So every honest crossing was read against a Dragon nearly
  // twice what it beat, and struck. The Dragon that fell stood on the anchor before the
  // last crossing; the least that can have been is anchorFloor, so that is what it is
  // read on. And it is fought in every body the save holds, with the best kit the crafts
  // could have carried, as the wardens and the tower are: 劍聖 a Sword Saint who crossed and
  // then dressed for the tower is a cultivator who beat that Dragon.
  if (newMarks > 0) {
    const faced = {
      ...after, realm: 9, layer: 8, tribulation: after.tribulation - 1,
      tribulationAt: anchorFloor(before, after.tribulation - 1),
    };
    const dragon = wardenOf(9);
    if (!bodiesHeld(faced).some((b) => beatable(b, dragon, undefined, bestKit(b, dragon, 'warden')))) why.push('warden');
  }
  // 塔 And the highest floor claimed has to be one this cultivator can take, in some body
  // the save holds. See towerVerdict.
  if (after.tower > Math.max(before.tower, held) && after.tower > 0) {
    const v = towerVerdict(after, after.tower);
    if (v === 'strike') why.push('tower');
    else if (v === 'wait' && !why.includes('too-fast')) why.push('too-fast');
  }

  // 劫 The Dragon's anchor only grows while the marks do: one that shrank was edited, to
  // make every Dragon after it easier.
  if (after.tribulation >= before.tribulation && after.tribulationAt < before.tribulationAt * 0.999) why.push('anchor');
  // And it grows by at least what each crossing grows it: a mark taken with the anchor
  // left where it was would make the next Dragon the one just beaten, every two days.
  else if (newMarks > 0 && after.tribulationAt < anchorFloor(before, after.tribulation) * 0.999) why.push('anchor');

  // 百煉 And every Hundredfold thing one the forge could have made: see hundredFits.
  if (!gearFits(after) || !hundredFits(after)) why.push('gear');
  if (freePoints(after) < 0) why.push('dao');
  // 道 The bank the road and the vault's shrines pay into: the most each newly answered
  // meeting could hand over, and a walk through the vault every DOOR_GAP at most (one
  // open at the start and one underway allowed for). validate() caps it only against the
  // start the save claims for itself. It is a matter of time, so it waits rather than
  // strikes: a month played offline and synced on the first day is honest, only early.
  if (after.metPoints - before.metPoints > metCeiling(before, after, dt, first) && !why.includes('too-fast')) {
    why.push('too-fast');
  }
  // 極 A branch's last node waits for CAPSTONE_REALM in the game, so one newly held below
  // it was not bought in the game. It waits rather than strikes: a pair that starts before
  // the gate existed may hold one honestly, and so it is only read from the same instant.
  if (!first && before.at >= DAO_BANK_STRICT_FROM && !capstonesOpen(after.realm) && !why.includes('too-fast')
    && after.unlocked.some((k) => NODE_BY_KEY[k]?.tier === CAPSTONE_TIER && !before.unlocked.includes(k))) {
    why.push('too-fast');
  }
  // 緣 Somebody on the road arrives MEET_GAP after the last at the soonest, so more new
  // meetings than the time allows waits. And an answer, once given, is given: one that
  // changed between two saves was edited, to take a boon the other answer did not give.
  const newlyMet = after.met.filter((k) => !before.met.includes(k)).length;
  if (newlyMet > Math.floor(Math.max(0, dt) / MEET_GAP) + 1 && !why.includes('too-fast')) why.push('too-fast');
  if (Object.entries(before.chose).some(([k, c]) => after.met.includes(k) && after.chose[k] !== undefined && after.chose[k] !== c)) {
    why.push('road');
  }

  // 擂 Three challengers a period, and a period is a week or a realm: more new bouts than
  // the weeks and the realms between the two saves allow is a matter of time, and waits.
  const periods = Math.floor(dt / WEEK) + 1 + Math.max(0, after.realm - before.realm) + 1;
  if (bouts > PLATFORM_EDGE.length * periods && !why.includes('too-fast')) why.push('too-fast');
  // 擂 And the highest challenger claimed this period has to be one some body the save
  // holds can beat, with the best kit, a trail and the temper answered. It is measured
  // against that body's own power, so an edited 力 cannot win it; a no only waits, because
  // the stance and the kit in hand at the fight are not in the save.
  // 擂 At the realm's grown edge from EDGE_STRICT_FROM, and at the flat one a phone on the
  // build before it fought.
  if (bouts > 0 && !why.includes('too-fast') && !platformBeatable(after, before.at >= EDGE_STRICT_FROM)) why.push('too-fast');
  // 香 The incense queued and the spring held only ever grow by what time fills: a stick
  // relit by hand to burn for ever is more incense than any spring could have given.
  if (!first && !why.includes('too-fast')) {
    // Read without 尋仙 first, which is nearly every pair; only a pair that would wait is
    // read again with the Seeker's step, if either save holds a body that is one.
    const grew = (k: number) => vaultStock(after, k) > (vaultStock(before, k) + dt * vaultRate(k)) * 1.001 + 60;
    if (grew(1) && grew(Math.max(seeker(before), seeker(after)))) why.push('too-fast');
  }

  // 心魔 A heart demon waits a night behind a shut door, so more of them than the nights
  // since the last sync (one already waiting allowed for) is a matter of time: it waits.
  // 鎖魂 A Soul-Lock Sigil makes one count twice, so two a night is honest.
  const perNight = after.realm >= RECIPE_BY_KEY['sigil:soullock'].realm ? 2 : 1;
  if (after.demons - before.demons > perNight * (Math.floor(dt / SECLUSION) + 1) && !why.includes('too-fast')) why.push('too-fast');

  // 疑 Possible, but faster over a day or a week than any honest cultivator was ever
  // measured to go. Not refused: flagged, and kept off the public boards until looked at.
  //
  // 塔 A whole tower climbed at once is a sprint the game itself paid for, so the floors'
  // sum is already in the pocket (above) before the pace is read, over a day and over a
  // week, and the pace is what the cultivator's own gathering had to cover.
  const pace = need / Math.max(1, dt);
  const suspect = (dt >= 7 * 86_400 && pace > SUSPECT_WEEK) || (dt >= 86_400 && dt < 7 * 86_400 && pace > SUSPECT_DAY);

  // A strike is an impossibility, never a matter of time: too fast only means "not yet".
  // 'shape' is another run: a second device, a wiped save, the local copy kept over the
  // cloud's. It used to be a strike, and an honest player on two phones was banned in a
  // quarter of an hour.
  // 'road' and 'anchor' are the same story when the save also went down: two copies of
  // one run (an APK and a browser, a phone and a tablet) each lived on, each met its own
  // road and its own Dragon, and the older one is just not progress. Struck, two honest
  // devices on one account were banned on game day 33 (the audit of 2026-10-05). A
  // straight successor that rewrites an answer or shrinks the anchor is still struck.
  const diverged = why.includes('went-down');
  const strike = why.some((w) => w !== 'went-down' && w !== 'too-fast' && w !== 'shape'
    && !(diverged && (w === 'road' || w === 'anchor')));
  return { ok: why.length === 0, why, used, strike, suspect, pace };
}

/**
 * 雷 The least time a mark can take: 雷池 the pool, MARK_DAYS of gathering, at the deepest
 * sitting and 宿慧 the larger Echo of the two saves.
 */
function markSeconds(before: State, after: State, focus: number): number {
  return MARK_DAYS * 86_400 / focus / Math.max(echoFactor(before.lives), echoFactor(after.lives));
}

/**
 * 轉世 A pair across a rebirth: `before` is the last life the server saw, `after` a life
 * that began since. Every rebirth is a life that crossed its marks, and every mark is the
 * pool filled, which is time: the marks each new entry in the record claims past what
 * `before` already held are paid first, out of the seconds that passed, at the fastest a
 * mark can be crossed. What is left is the new life's own time, and the new life is
 * verified as any climb is, from the state it was born as (bornFrom, the function the
 * game itself is reborn through) to what it is now.
 *
 * So an edited record can do two things and no more: claim marks it would have had to
 * wait for (it waits, like any gain the time does not cover), or claim an Echo it did not
 * earn, which raises every bound here by ECHO_CEILING at most, because that is the most
 * any record can give. The ended life's floors and Dragons are not read again: they were
 * read when they were synced, and once a life ends the body that won them is gone.
 */
function reborn(before: State, after: State, dt: number, first: boolean): Verdict {
  const focus = FOCUS_MAX + Math.max(focusBonus(before.unlocked), focusBonus(after.unlocked));
  const fresh = after.lives.slice(before.lives?.length ?? 0);
  let marks = 0;
  fresh.forEach((l, i) => { marks += i === 0 ? Math.max(0, l.marks - before.tribulation) : l.marks; });
  const old = marks * markSeconds(before, after, focus);
  const at = Math.min(after.at, Math.max(before.at, fresh[fresh.length - 1].at));
  // 承 The codex the new life was born with: what `before` had finished at the least, and
  // more where the life went on forging after the server last saw it. A record that holds
  // less than `before` had is not this cultivator's successor (went-down); one that holds
  // more is bounded by validate() at what a first life could finish, and every bonus it
  // gives is capped (CODEX_CAP) and never touches the qi rate.
  const owed = codexToKeep(before);
  const kept = keptCovers(after.codexKept, owed) ? after.codexKept : owed;
  const born = bornFrom(before, after.lives, at, kept);
  // 業 And the experience it was born with: CRAFT_CARRY of the old life's, which `before` may
  // not have seen the end of. The most that can have been is the share of what `before` held
  // plus every second since at the fastest a craft pays, so the new life starts from what
  // its save says up to that, and only what is above it is read as gained (and has to fit
  // the time). Never from less than bornFrom gives, so a save with no carry reads as before.
  const owedXp = born.crafts.xp;
  const roof = carriedXp(Object.fromEntries(SKILL_KEYS.map((k) => [k, (before.crafts?.xp[k] ?? 0) + dt * XP_PER_SECOND_MAX[k]])) as State['crafts']['xp']);
  const xp = Object.fromEntries(SKILL_KEYS.map((k) => [k, Math.max(owedXp[k], Math.min(after.crafts?.xp[k] ?? 0, roof[k]))])) as State['crafts']['xp'];
  const start = { ...born, crafts: { ...born.crafts, xp }, startedAt: after.startedAt };
  const v = verify(start, after, Math.max(0, dt - old), first, 0);
  const late = old > dt * SLACK && !v.why.includes('too-fast');
  return late ? { ...v, ok: false, why: [...v.why, 'too-fast'] } : v;
}

/**
 * 泉 Seconds of gathering the vault's spring can have paid across a gap of dt: a day held
 * and dt filled, each second worth SPRING_FILL, burned rather than drunk (INCENSE_WORTH),
 * in the week's blessed room (BLESSED_ROOM) by an Immortal Seeker (PAIR_SPRING). Generous
 * on purpose: every factor at its largest at once is more than any one run can be.
 */
export function vaultSeconds(dt: number): number {
  return (SPRING_HOLD + Math.max(0, dt)) * SPRING_FILL * INCENSE_WORTH * BLESSED_ROOM * PAIR_SPRING;
}

/**
 * 香 What the vault holds in a save, in seconds of gathering at its most generous: the
 * spring as it stands now (a day at most) and the incense still queued. Between two saves it
 * can only grow by what the spring could fill (vaultRate per second); drinking, burning
 * and the third doors only ever take from it.
 */
export function vaultStock(s: State, seekerStep = PAIR_SPRING): number {
  const spring = Math.min(SPRING_HOLD, Math.max(0, s.spring ?? 0) + Math.max(0, s.at - (s.springAt ?? s.at)));
  const queued = Math.max(0, (s.incenseUntil ?? 0) - s.at);
  return spring * vaultRate(seekerStep) + queued * INCENSE_BONUS;
}

/** 香 How fast the stock can grow: a second of fill, at its most generous. */
function vaultRate(seekerStep: number): number {
  return SPRING_FILL * INCENSE_WORTH * BLESSED_ROOM * seekerStep;
}

/** 尋仙 The Immortal Seeker's step, if any body the save holds is one. */
function seeker(s: State): number {
  return bodiesHeld(s).some((b) => classSpring(b) > 1) ? PAIR_SPRING : 1;
}


/**
 * 擂 Whether the highest challenger this save claims for its period could have fallen to
 * some body it holds: the best kit its crafts could carry, a trail taken, and the temper
 * answered. A save whose period has turned claims nothing that can still be read, and
 * passes: its bouts were counted against the weeks above.
 *
 * `grown` reads the challenger at the realm's grown edge (platformEdge); without it, at the
 * flat PLATFORM_EDGE every challenger stood at before 2026-10-08 (see EDGE_STRICT_FROM).
 */
export function platformBeatable(s: State, grown = true): boolean {
  const n = beatenNow(s);
  if (n <= 0) return true;
  const tier = (n - 1) as Tier;
  return bodiesHeld(s).some((b) => {
    const shape = challengerOf(b, tier);
    // The temper answered: the challenger at its edge alone.
    // 擂 At the realm's own edge (platformEdge), the one the phone's challenger stood at.
    const standing = power(b) * (grown ? platformEdge(tier, b.realm) : PLATFORM_EDGE[tier]);
    return beatable(b, shape, standing, { ...bestKit(b, shape, 'platform'), wound: TRAIL_WOUND });
  });
}

/**
 * 套 Every body this save can walk into a fight in: what is worn, each saved 套 loadout
 * put on the way the game puts one on (wearSet), and the strongest the chest can dress
 * without a loadout, for the cultivator who swapped by hand.
 */
export function bodiesHeld(s: State): State[] {
  const own = [s, ...s.sets.map((_, i) => wearSet(s, i).state), strongestFromChest(s)];
  // 岔 And each of them on the tree with a held fork swapped, since the fight may have
  // been won the day before the swap (sim/fork.ts).
  const trees = forkTrees(s.unlocked).slice(1);
  return trees.length ? [...own, ...trees.flatMap((t) => own.map((b) => ({ ...b, unlocked: [...t] })))] : own;
}

/**
 * 箱 The body the chest dresses best for 力 power, one place at a time, through equip()
 * as the screen does, 承 each piece at the refining of the place it goes in. Greedy, so
 * it can miss a class two places make together; the wait in towerVerdict covers what it
 * misses.
 */
function strongestFromChest(s: State): State {
  let body = s;
  for (const slot of SLOTS) {
    let best = body;
    let most = power(body);
    for (const item of body.chest) {
      if (!TEMPLATE_BY_KEY[item.template] || templateOf(item).slot !== slot) continue;
      const next = equip(body.worn, body.chest, item, slot);
      const tried = { ...body, worn: next.worn, chest: [...next.chest] };
      const p = power(tried);
      if (p > most) { most = p; best = tried; }
    }
    body = best;
  }
  return body;
}

/**
 * 塔 Whether a claimed floor could have fallen to this save, read against the strongest
 * body it holds.
 *
 * It used to read only what was worn at the sync. A cultivator who climbed in one 套
 * loadout and then put on another (the 器 Artificer's for refining, the 運 Fortune
 * Seeker's for hunting) before the next sync was struck for a floor they had honestly
 * taken, and a strike is the one verdict an honest player must never see. Measured on the
 * active cultivator's first ninety days: of 47 syncs that brought new floors, climbing and
 * then taking the climbing loadout off was struck 46 times. So every body the save holds
 * is tried, and the floor stands if any of them can take it: 0 strikes, all 47 accepted.
 *
 * Past TOWER_FORGED times the furthest any of them reaches (its power, over the share of
 * a floor its class counts) it is no fight at all: no roll of the dice closes a gap that
 * wide, so it was written into the save, and it is a
 * strike. Short of that, a floor no body beats now is a matter of time rather than proof:
 * the pieces it fell to may sit loose in the chest, in no loadout, so it waits, and counts
 * once the cultivator is strong enough again. Nothing is lost by waiting.
 */
export function towerVerdict(s: State, floor: number): 'ok' | 'wait' | 'strike' {
  const bodies = bodiesHeld(s);
  // 攜 With the strongest kit its crafts could have carried up, as for the wardens: a pill
  // or a sigil may go up the tower since 2026-10-05, and the server never sees which did.
  const shape = floorBeast(floor);
  const kits = bodies.map((b) => bestKit(b, shape, 'tower'));
  // 劍仙 A floor counts PAIR_TOWER of itself against a Sword Immortal, so what a body can
  // reach is its power over that share: read as bare power, an honest Immortal's highest
  // floor stood ×6.85 past it. See TOWER_FORGED. And the kit carries it further (kitReach).
  const reach = Math.max(...bodies.map((b, i) => (power(b) / classTower(b)) * kitReach(kits[i])));
  const standing = floorPower(floor);
  if (reach > 0 && standing / reach > TOWER_FORGED) return 'strike';
  return bodies.some((b, i) => beatable(b, shape, standing, kits[i])) ? 'ok' : 'wait';
}

/**
 * 攜 How much further than its power a kit can carry a body, for the forgery bound only.
 *
 * In a fight both sides' health and blows scale with their power, so a power ratio enters
 * twice: striking S harder (or sending R of every blow back) and taking T less is worth
 * √((S + R) / T) of power, a revive to full doubles the health (√2), and mending M of the
 * whole every round for ROUND_CAP rounds is worth at most √(1 + M × ROUND_CAP). It is a
 * ceiling, never an estimate, read off bestKit, which is a ceiling too: the bound only
 * has to stay as far past an honest kit-assisted climber as it stood past a bare one.
 * Measured with tools/towerkit.ts (2026-10-05), every climbing habit with both crafts at
 * 99: the furthest floor any kit makes beatable stands under ×5.4 of this reach, where
 * power alone read it up to ×16.6, past TOWER_FORGED, and would have struck it.
 */
export function kitReach(k: Kit): number {
  return Math.sqrt((k.strike + k.reflect) / Math.max(1e-9, k.taken)) * (k.revive ? Math.SQRT2 : 1)
    * Math.sqrt(1 + k.mend * ROUND_CAP);
}

/**
 * 塔 How many times stronger than the strongest body a save holds a claimed floor may be
 * before it is a forgery rather than a wait.
 *
 * It was 4, inline, until 2026-10-04, and 4 was a knife edge. 力 the number on the screen
 * is not the whole fight (the stance, the sequence, 破甲 and 破煞 all count beside it), and
 * the highest floor an honest cultivator can win at any odds stands well past it:
 * measured every three days of every climbing habit, up to ×4.19 its own power (active),
 * ×3.47 to ×4.12 for the rest, and the highest floor actually held up to ×2.94. A lucky
 * honest win there was a strike. At 8 the bound sits twice past the furthest honest reach,
 * and everything short of it that no body can win now waits instead (towerVerdict). An
 * edited floor is not near it: floor 500, claimed by the active cultivator at its
 * strongest of the first ninety days, is ×10^31.
 *
 * 量 Measured again the same day, when 劍仙 the Sword Immortal's floors went to 0.65 of
 * themselves (balance.ts PAIR_TOWER). Twice past the furthest reach was no longer true:
 *
 *   every habit, every three days from the fifth realm      up to ×4.25 (drives it all)
 *   the realm 5 to 9 bodies of every class, average rolls   up to ×5.48 (法 Arts, 羅漢 Arhat)
 *   a Sword Immortal, read as bare power                    up to ×6.85, a breath under 8
 *   the same, read through its own floors (classTower)      up to ×4.45
 *
 * So a body's reach is read through its class (towerVerdict), and the bound is 12, twice
 * past ×5.48 again. Floor 500 is still ×10^31.
 *
 * 攜 And through its kit, since a pill and a sigil may go up the tower (2026-10-05). For a
 * hand with Alchemy and Sigil Writing at 99, the furthest floor the best kit makes
 * beatable at all stood up to ×16.6 past its power (drives it all, ninth realm: a 九轉
 * revive, a Heaven Seal and a mend, one lucky fight in thousands), past the line itself.
 * Read through kitReach, every climbing habit stays under ×5.4, twice inside the line
 * again, and floor 500 is no nearer.
 */
export const TOWER_FORGED = 12;

/**
 * 初 What a first sync is measured from: a cultivator who began when the save says they
 * did, but never before the game existed, never in the future, and never more than
 * PRE_JOIN_CREDIT before the account was made.
 */
export function firstSync(after: State, now: number, joinedAt = now): { before: State; seconds: number; first: true } {
  const start = Math.max(GAME_EPOCH, Math.min(now, after.startedAt), Math.min(now, joinedAt) - PRE_JOIN_CREDIT);
  const before = { ...newState(start), startedAt: after.startedAt };
  return { before, seconds: now - start, first: true };
}
