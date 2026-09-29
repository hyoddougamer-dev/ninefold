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
import { FOCUS_MAX, LAYERS, MARK_DAYS, TRIBULATION_CHALLENGE } from './balance.ts';
import {
  UPGRADES, UPGRADE_INFO, capOf, heavenStep, layersOpened, power, rate, tribulationScale, upgradeCost,
  newState, type State,
} from './state.ts';
import { layerCost } from './time.ts';
import { beastPower, oddsRaw } from './combat.ts';
import { heavensOpened } from '../data/heavens.ts';
import { meetingOf } from '../data/meetings.ts';
import { DOOR_GAP, RUN_DAO_CEILING } from '../data/secret.ts';
import { MEET_GAP, SECLUSION } from './balance.ts';
import { focusBonus } from './dao.ts';
import { freePoints } from './points.ts';
import { driveFloor } from './hunt.ts';
import { floorBeast, floorPower } from './tower.ts';
import { pillCost } from './furnace.ts';
import { LINES } from '../data/alchemy.ts';
import { BEASTS, wardenOf } from '../data/bestiary.ts';
import { templateOf, type Item } from '../data/gear.ts';

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
 * cultivator measured (SUSPECT_WEEK) could keep; anything more waits and counts later.
 */
export const FIRST_PACE = 0.55;

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
 * with some room on top: 1.38 over a day and 0.44 over a week, both by the one who plays
 * every waking hour, walked 120 days. Faster than that is flagged.
 */
export const SUSPECT_DAY = 1.6;
export const SUSPECT_WEEK = 0.55;

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
 */
export function anchorFloor(before: State, marks: number): number {
  const base = beastPower(wardenOf(9));
  let at = before.tribulationAt;
  for (let m = before.tribulation; m < marks; m++) {
    const dragon = Math.max(base * tribulationScale(m), at * TRIBULATION_CHALLENGE);
    const step = heavensOpened(m + 1) > heavensOpened(m) ? heavenStep() : 1;
    at = Math.max(at, dragon) * step;
  }
  return at;
}

/** 道 The most 道 the road and the vault could have paid between two saves. */
function metCeiling(before: State, after: State, dt: number): number {
  const road = after.met.filter((k) => !before.met.includes(k)).reduce((n, k) => {
    const m = meetingOf(k);
    return n + (m ? Math.max(0, ...m.picks.map((p) => (p.outcome.kind === 'dao' ? p.outcome.points : 0))) : 0);
  }, 0);
  return road + (Math.ceil(Math.max(0, dt) / DOOR_GAP) + 2) * RUN_DAO_CEILING;
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
    || after.demons < before.demons
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

  // 得 One-off payments (a tower floor is six hours of qi at once, a meeting two) arrive in
  // bursts, so a short gap can hold more than its own seconds. They are allowed for as a
  // burst on top of the real time: BURST times the gap, never more than BURST_CAP. A
  // burst bigger than that is not refused for ever, only until real time catches up: the
  // server keeps measuring from the last save it accepted, so the gap grows until it
  // pays. What cannot happen is a long gap going faster than the fastest honest one.
  const have = first ? dt * FIRST_PACE : dt + Math.min(dt * BURST, BURST_CAP);
  const used = need / Math.max(1, have * SLACK);
  if (used > 1) why.push('too-fast');

  // 擊 Fights beyond a hand's pace that the qi could not have bought as drives.
  // Measured without what the drives themselves could have dropped, or a million edited
  // kills would pay for their own drives in melted gear.
  if (drove > 0 && driveFloor(before, Math.ceil(drove)) / rEnd > have * SLACK) why.push('too-many-kills');

  // 守 Every realm crossed had a warden in the way, and this build has to be able to beat it.
  for (let r = before.realm; r < after.realm; r++) {
    const w = wardenOf(r);
    if (oddsRaw({ ...after, realm: r, layer: 8 }, w) <= 0) { why.push('warden'); break; }
  }
  // 劫 Every mark is a Dragon beaten, and the last one has to be beatable by this build.
  if (newMarks > 0) {
    const faced = { ...after, realm: 9, layer: 8, tribulation: after.tribulation - 1 };
    if (oddsRaw(faced, wardenOf(9)) <= 0) why.push('warden');
  }
  // 塔 And the highest floor claimed has to be one this build can take.
  if (after.tower > before.tower && after.tower > 0) {
    const f = after.tower;
    if (power(after) > 0 && floorPower(f) / power(after) > 4) why.push('tower');
    else if (oddsRaw(after, floorBeast(f), floorPower(f)) <= 0) why.push('tower');
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
  if (after.metPoints - before.metPoints > metCeiling(before, after, dt) && !why.includes('too-fast')) {
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

  // 心魔 A heart demon waits a night behind a shut door, so more of them than the nights
  // since the last sync (one already waiting allowed for) is a matter of time: it waits.
  if (after.demons - before.demons > Math.floor(dt / SECLUSION) + 1 && !why.includes('too-fast')) why.push('too-fast');

  // 疑 Possible, but faster over a day or a week than any honest cultivator was ever
  // measured to go. Not refused: flagged, and kept off the public boards until looked at.
  const pace = need / Math.max(1, dt);
  const suspect = (dt >= 7 * 86_400 && pace > SUSPECT_WEEK) || (dt >= 86_400 && pace > SUSPECT_DAY);

  // A strike is an impossibility, never a matter of time: too fast only means "not yet".
  // 'shape' is another run: a second device, a wiped save, the local copy kept over the
  // cloud's. It used to be a strike, and an honest player on two phones was banned in a
  // quarter of an hour.
  const strike = why.some((w) => w !== 'went-down' && w !== 'too-fast' && w !== 'shape');
  return { ok: why.length === 0, why, used, strike, suspect, pace };
}

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
