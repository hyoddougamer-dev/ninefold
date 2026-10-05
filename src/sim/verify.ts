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
  BLESSED_ROOM, FOCUS_MAX, INCENSE_BONUS, INCENSE_WORTH, LAYERS, MARK_DAYS, MELT_CAP, MELT_FILL, PAIR_BOUNTY,
  PAIR_DRAGON, PAIR_MELT, PAIR_SPRING, PAIR_TOWER_QI, PLATFORM_EDGE, PLATFORM_HOURS, QUARRY_HOURS, SPRING_FILL,
  SPRING_HOLD, TRAIL_WOUND, TRIBULATION_CHALLENGE,
} from './balance.ts';
import { WEEK } from './week.ts';
import { beatenNow, challengerOf, type Tier } from './platform.ts';
import { classSpring } from './schools.ts';
import {
  UPGRADES, UPGRADE_INFO, capOf, heavenStep, layersOpened, power, rate, tribulationScale, upgradeCost,
  newState, type State,
} from './state.ts';
import { layerCost } from './time.ts';
import { beastPower, beatable } from './combat.ts';
import { heavensOpened } from '../data/heavens.ts';
import { meetingOf } from '../data/meetings.ts';
import { DOOR_GAP, RUN_DAO_CEILING } from '../data/secret.ts';
import { MEET_GAP, ROUND_CAP, SECLUSION } from './balance.ts';
import { CAPSTONE_TIER, capstonesOpen, focusBonus } from './dao.ts';
import { NODE_BY_KEY } from '../data/techniques.ts';
import { freePoints } from './points.ts';
import { driveFloor } from './hunt.ts';
import { XP_PER_SECOND_MAX, bestKit } from './crafts.ts';
import type { Kit } from './kit.ts';
import { RECIPE_BY_KEY, SKILL_KEYS, arrayKey } from '../data/crafts.ts';
import { CRAFT_ARRAY_DOOR } from './balance.ts';
import { floorBeast, floorHours, floorPower } from './tower.ts';
import { opensAt } from './unlocks.ts';
import { classTower } from './schools.ts';
import { wearSet } from './sets.ts';
import { pillCost } from './furnace.ts';
import { LINES } from '../data/alchemy.ts';
import { BEASTS, wardenOf } from '../data/bestiary.ts';
import { SLOTS, TEMPLATE_BY_KEY, templateOf, type Item } from '../data/gear.ts';
import { equip } from './chest.ts';

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
 * 0.55 when SUSPECT_WEEK came down to 0.52: a first sync waiting is a cost to an honest
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
 * with some room on top: 1.32 over a day and 0.46 over a week, both by the one who plays
 * every waking hour, walked 120 days. Faster than that is flagged.
 *
 * 塔 The week came down from 0.55 with the tower's taper above the warden floor
 * (2026-10-04, TOWER_QI_ABOVE). The fastest honest week fell from 0.49 to 0.46, and the
 * weeks that had given a clock run three times as fast away were its tower lumps: at 0.55
 * that clock was ranked for 45 days and never flagged. At 0.52 it is flagged on day 21
 * as before, and the room above the fastest honest week is the same twelfth it was.
 */
export const SUSPECT_DAY = 1.6;
export const SUSPECT_WEEK = 0.52;

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
  | 'shape';         // another run of the game than the one verified (startedAt); never a strike

export interface Verdict {
  readonly ok: boolean;
  readonly why: readonly Why[];
  /** How much of the time budget the gains used. Above 1 is too fast. Kept for the record. */
  readonly used: number;
  /** A cheat, as opposed to a restore or a second device: counts toward a player's strikes. */
  readonly strike: boolean;
  /** Seconds the gains needed at the best rate, per second that passed. */
  readonly pace: number;
  /** Faster than any honest cultivator measured, over a day or more: flagged for review. */
  readonly suspect: boolean;
}

const sum = (xs: readonly number[]) => xs.reduce((a, b) => a + b, 0);
const kills = (s: State) => sum(Object.values(s.killed));

/** What the qi-priced levels bought between the two cost, level by level. */
function levelsBetween(a: State, b: State): number {
  let q = 0;
  for (const u of UPGRADES) {
    if (UPGRADE_INFO[u].currency !== 'qi') continue;
    for (let l = a.levels[u]; l < b.levels[u]; l++) {
      q += upgradeCost({ ...b, levels: { ...b.levels, [u]: l } }, u);
    }
  }
  return q;
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
  return rate({ ...probe, levels, worn });
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
 * below the cultivator's strength falls in a few minutes, and each one pays hours. The
 * floors were left to the burst allowance, which is a few minutes against a sync five
 * minutes long, so the climb waited, and against the day behind it the pace read as
 * faster than anybody honest: flagged, for the game's own payment. Each floor is a fight
 * the save has to be able to win (towerVerdict), so its pay is allowed for as itself.
 *
 * A floor pays floorHours at the rate with nothing worn (trials.ts), 天師 the Celestial
 * Master a quarter again. The server does not know which realm it fell in, so each floor
 * is read at whichever realm between the two saves paid it most, the rate there with only
 * what could have been owned there (rateOn). Reading every floor at the earliest realm's
 * hours and the latest realm's rate let a week that crossed a realm pay for itself twice.
 * A phone still on the build before 2026-10-04 paid some floors more than this, and waits
 * a little.
 */
export function towerQi(before: State, after: State, first: boolean): number {
  // A first sync has its own allowance (FIRST_PACE, FIRST_SITTING), and a month of floors
  // brought to it would buy a month of anything else.
  if (first) return 0;
  const lo = Math.max(0, Math.floor(before.tower));
  const hi = Math.max(lo, Math.floor(after.tower));
  if (hi === lo) return 0;
  const bare = { ...after, worn: {} as State['worn'] };
  const realms: { realm: number; rate: number }[] = [];
  for (let r = Math.max(before.realm, opensAt('tower')); r <= after.realm; r++) {
    // The furthest rung of that realm the pair reached: its last, or where the later save stands.
    const top = r === after.realm ? after.layer : 8;
    realms.push({ realm: r, rate: rateOn(bare, Math.min(LAYERS - 1, (r - 1) * 9 + top)) });
  }
  let qi = 0;
  for (let f = lo + 1; f <= hi; f++) qi += Math.max(0, ...realms.map((x) => floorHours(f, x.realm) * x.rate));
  return qi * 3600 * PAIR_TOWER_QI;
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
  // 秘門 The Hidden Door Array opens the door sooner, so a save holding one is read at its gap.
  const gap = (after.crafts.pouch[arrayKey('hiddendoor')] ?? 0) > 0 ? DOOR_GAP - CRAFT_ARRAY_DOOR : DOOR_GAP;
  // 鑰 And a Realm Key can open it once more a day: see useKey in sim/secret.ts.
  return road + (Math.ceil(Math.max(0, dt) / gap) + Math.ceil(Math.max(0, dt) / 86_400) + 2) * RUN_DAO_CEILING;
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
  const all = [...Object.values(s.worn), ...s.chest].filter(Boolean) as Item[];
  return all.every((x) => (templateOf(x)?.realm ?? 1) <= s.realm);
}

/**
 * 驗 The verdict. `before` is the last save the server accepted, `after` the one being
 * offered, `seconds` the server time between them. For a first sync, pass
 * `firstSync(after, now)` as `before`.
 */
export function verify(before: State, after: State, seconds: number, first = false): Verdict {
  const why: Why[] = [];
  const dt = Math.max(0, seconds);

  if (after.startedAt !== before.startedAt) why.push('shape');

  // 下 Anything that can only ever grow, having shrunk, is a restore or a second device.
  const down = layersOpened(after) < layersOpened(before)
    || after.tribulation < before.tribulation
    || after.tower < before.tower
    // 擂 Every challenger ever beaten: a count that only grows.
    || (after.bouts ?? 0) < (before.bouts ?? 0)
    || after.demons < before.demons
    // 鑰 The day the last Realm Key turned only moves forward.
    || (after.keyDay ?? 0) < (before.keyDay ?? 0)
    || UPGRADES.some((u) => after.levels[u] < before.levels[u])
    // Commons only: a warden's count is a marker the arts read, not a tally that pays.
    || BEASTS.some((b) => !b.warden && (after.killed[b.key] ?? 0) < (before.killed[b.key] ?? 0));
  if (down) why.push('went-down');

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

  let pocket = before.qi;
  let need = 0;
  for (let n = from; n < to && n < LAYERS - 1; n++) {
    const cost = layerCost(Math.floor(n / 9) + 1, n % 9, after.unlocked);
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
  need += newMarks * MARK_DAYS * 86_400 / focus;
  // 塔 And every floor climbed is a fight, fought at a hand's pace at best.
  need += Math.max(0, after.tower - before.tower) * MIN_FIGHT_SECONDS;

  // 得 One-off payments (a tower floor is up to six hours of qi at once, a meeting two) arrive in
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
  // 期 And the week's quarry pays QUARRY_HOURS of gathering at once, 金剛 the Vajra's half
  // again at most, the week it is first taken: a lump, allowed for as itself.
  const quarry = (after.quarryWeek ?? 0) > (before.quarryWeek ?? 0) ? QUARRY_HOURS * 3600 * PAIR_BOUNTY / focus : 0;
  // 塔 And the floors climbed paid their qi once, a lump as well. It is allowed for as the
  // seconds it would take at the fastest rate there was, the fewest it can be worth: the
  // server cannot know when each floor fell, and towerQi is a ceiling, not a measurement.
  const tower = towerQi(before, after, first) / rEnd;
  // 泉 The vault's spring fills with time and nothing else: a day held, plus what dt could
  // fill, each second of it worth at most INCENSE_WORTH (burned rather than drunk), the
  // week's blessed room and 尋仙 the Immortal Seeker's deeper draught. It used to hide inside
  // BURST; counted as itself it is independent of how many runs were walked, so the door
  // gap, the Realm Key and the Hidden Door Array need no qi term at all. A first sync has
  // its own allowance (FIRST_PACE, FIRST_SITTING), as for the floors.
  const spring = first ? 0 : vaultSeconds(dt) / focus;
  // 擂 Each challenger beaten paid at most PLATFORM_HOURS' largest at the bare rate, the
  // Vajra's half again at most: a lump, allowed for as itself, as the quarry is.
  const bouts = Math.max(0, (after.bouts ?? 0) - (before.bouts ?? 0));
  const platform = first ? 0 : (bouts * Math.max(...PLATFORM_HOURS) * 3600 * PAIR_BOUNTY) / focus;
  const have = (first ? dt * FIRST_PACE + FIRST_SITTING : dt + Math.min(dt * BURST, BURST_CAP)) + melted + quarry + tower
    + spring + platform;
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
    const there = { ...after, realm: r, layer: 8 };
    if (!beatable(there, w, undefined, bestKit(there, w, 'warden'))) { why.push('warden'); break; }
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
  if (after.tower > before.tower && after.tower > 0) {
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

  if (!gearFits(after)) why.push('gear');
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
  if (bouts > 0 && !why.includes('too-fast') && !platformBeatable(after)) why.push('too-fast');
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
  // 塔 Over a day, a whole tower climbed at once is a sprint the game itself paid for, so
  // the floors' share comes off before the day's pace is read. Over a week it stays in:
  // SUSPECT_WEEK was measured on cultivators who climb, so their floors are already in
  // it, and towerQi is a ceiling a long window would let a fast clock hide under.
  const pace = need / Math.max(1, dt);
  const sprint = Math.max(0, need - tower) / Math.max(1, dt);
  const suspect = (dt >= 7 * 86_400 && pace > SUSPECT_WEEK) || (dt >= 86_400 && dt < 7 * 86_400 && sprint > SUSPECT_DAY);

  // A strike is an impossibility, never a matter of time: too fast only means "not yet".
  // 'shape' is another run: a second device, a wiped save, the local copy kept over the
  // cloud's. It used to be a strike, and an honest player on two phones was banned in a
  // quarter of an hour.
  const strike = why.some((w) => w !== 'went-down' && w !== 'too-fast' && w !== 'shape');
  return { ok: why.length === 0, why, used, strike, suspect, pace };
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
 */
export function platformBeatable(s: State): boolean {
  const n = beatenNow(s);
  if (n <= 0) return true;
  const tier = (n - 1) as Tier;
  return bodiesHeld(s).some((b) => {
    const shape = challengerOf(b, tier);
    // The temper answered: the challenger at its edge alone.
    const standing = power(b) * PLATFORM_EDGE[tier];
    return beatable(b, shape, standing, { ...bestKit(b, shape, 'platform'), wound: TRAIL_WOUND });
  });
}

/**
 * 套 Every body this save can walk into a fight in: what is worn, each saved 套 loadout
 * put on the way the game puts one on (wearSet), and the strongest the chest can dress
 * without a loadout, for the cultivator who swapped by hand.
 */
export function bodiesHeld(s: State): State[] {
  return [s, ...s.sets.map((_, i) => wearSet(s, i).state), strongestFromChest(s)];
}

/**
 * 箱 The body the chest dresses best for 力 power, one place at a time, through equip()
 * so 承 refining moves exactly as it does on the screen. Greedy, so it can miss a class
 * two places make together; the wait in towerVerdict covers what it misses.
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
