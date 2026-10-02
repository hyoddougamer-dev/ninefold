/**
 * 勤 The habit harness: five cultivators with the same game and different lives.
 *
 * It lives here rather than in a test because two things read it: `players.test.ts`,
 * which asserts the order and prints the table on every run, and `bible.ts`, which puts
 * the same table on the page. A measurement that appears twice has to be made once.
 */
import { answer, canAnswer, giftOf, meetingDue, priceOf } from '../src/sim/meet.ts';
import { conquer, conquerTwice, demonDue, demonOf, demonPower, repel, seclude } from '../src/sim/seclusion.ts';
import { FORGED, NOT_USED, kitFor, soulLocked, spendKit, work } from '../src/sim/crafts.ts';
import { NO_KIT } from '../src/sim/kit.ts';
import { carryBest, craftVisit, toLearn } from './crafter.ts';
import { fuseIn, stash } from '../src/sim/stash.ts';
import { LAYERS, focusAt, ladderBetween } from '../src/sim/balance.ts';
import {
  UPGRADES, atCeiling, breakThrough, buy, canBreakThrough, canBuy, canCondense,
  canFightWarden, condense,
  newState, power, upgradeCost, type State,
} from '../src/sim/state.ts';
import { advance, layersOpened, rate } from '../src/sim/time.ts';
import { fight, odds, takeKill } from '../src/sim/combat.ts';
import { DRIVE_SIZES, canDrive, drive, driveCost } from '../src/sim/hunt.ts';
import { huntable, wardenOf } from '../src/data/bestiary.ts';
import { isOpen } from '../src/sim/unlocks.ts';
import { STANCES } from '../src/data/arts.ts';
import { brew, canBrew, canRefine, clearFloor, refine, refinePrice, standingFloor } from '../src/sim/trials.ts';
import { floorBeast, floorPower } from '../src/sim/tower.ts';
import { ALL_NODES, type Path } from '../src/data/techniques.ts';
import { canUnlock, focusBonus } from '../src/sim/dao.ts';
import { freePoints } from '../src/sim/points.ts';
import { BEDS, canPlant, harvestAll, plant, plantable } from '../src/sim/cave.ts';
import {
  canEnter, doorsAt, enter as enterSecret, giftOf as secretGift, roomsFor,
  inside as insideSecret, leave as leaveSecret, open as openDoor,
} from '../src/sim/secret.ts';
import { TRIOS, cardDue as awakeningDue, take as takeAwakening } from '../src/sim/awaken.ts';
import { dropFor, noteFate } from '../src/sim/fate.ts';
import { fortuneOf } from '../src/sim/fortune.ts';
import { salvageUpTo } from '../src/sim/salvage.ts';
import { equip, fusable, itemWorth } from '../src/sim/chest.ts';
import { swing } from '../src/sim/inspect.ts';
import { ARCHETYPES, RARITY_INFO, SLOTS, callingOf, schoolOf, templateOf, type Item, type Slot } from '../src/data/gear.ts';
import { PAIRS, schoolOfAxis, type Pair, type School } from '../src/data/schools.ts';
import { SCHOOL_WAKES } from '../src/sim/balance.ts';
import type { Beast } from '../src/data/bestiary.ts';

const T0 = 1_700_000_000;
const DAY = 86_400;

export interface Habit {
  readonly name: string;
  /** Visits a day. */
  readonly checks: number;
  /** Minutes the app is actually open on a visit. */
  readonly minutes: number;
  /** Beasts hunted on a visit. */
  readonly hunts: number;
  /** 器 Whether they pick up what falls and wear it. */
  readonly gear: boolean;
  readonly tower: boolean;
  readonly furnace: boolean;
  readonly build: boolean;
  /**
   * 爐 When they light the furnace, which turns out to be the whole question.
   *
   * 誤 For the whole of this harness's life there was one policy and it was never named:
   * brew only when the warden is out of reach. Measured against that, 爐 the furnace is
   * touched on 0% of visits and multiplies a finished cultivator's power by ×1.00, and
   * the obvious reading is that the system is dead. That reading is about the policy and
   * not about the game. A pill makes beasts read weaker, 塔 the tower is the one place
   * during the climb where a beaten beast pays **qi**, and a floor is worth six hours of
   * gathering. So there is a second policy the game plainly allows and nothing was
   * playing: brew whenever it buys a floor.
   */
  readonly brews?: 'stuck' | 'tower';
  /**
   * 圍 Whether they buy drives with the qi they are not spending on the ladder.
   *
   * A drive costs qi and pays material, and it is the only thing in the game that
   * converts one into the other. So it has to be measured the way everything else is:
   * a cultivator who pours every spare coin into hunting is the worst case for the
   * economy, and this is the habit that plays them.
   */
  readonly drives?: boolean;
  /**
   * 悟道 Which of the three they reach for at a breakthrough.
   *
   * It is a preference and not a script: if the trio holds nothing of that kind they
   * take the first card, the way anybody does. The point of asking is that a system the
   * harness never uses is a system no curve can tell you is wrong, and 悟道 is eight
   * permanent choices across a climb.
   */
  readonly cards?: 'material' | 'salvage' | 'dao';
  /**
   * 職 The class they are building, if any: a school, or one of the ten pairs.
   *
   * Without it a cultivator wears what the game marks ▲ and ends up in whatever class
   * that happens to make. With it they wear pieces of their schools over pieces of
   * others, and never take one off to make room for a stranger, which is what somebody
   * building a class does. `classes.test.ts` plays all fifteen.
   */
  readonly calling?: School | Pair;
  /**
   * 業 Whether they work the workshop, and carry what it makes into every hard fight.
   *
   * The crafts touch the climb in one place only: an elixir and a sigil carried into a
   * warden, a heart demon or a vault gate. So this is the habit that answers what the
   * whole workshop is worth to the ladder, played greedily (see tools/crafter.ts).
   */
  readonly crafts?: boolean;
  /** One line for the page: who this is. */
  readonly who: string;
  /** 道 The branch they walk, bought the moment the points allow. */
  readonly branch?: Path;
}

/**
 * 道 Which branch each of them walks.
 *
 * For most of this game's life the answer was *none*: no habit carried a `branch`, so
 * `spendTree` was a no-op and every curve ever printed: in the tests, in the bible, in
 * the arguments those numbers settled: was walked by a cultivator who had never spent a
 * 道 point. The tree is the game's whole theorycrafting and it had never been measured.
 *
 * Everyone who builds walks 劍 the Sword, because a shared axis is what makes five rows
 * comparable: if each habit took a different branch, the table would be measuring the
 * branches and pretending to measure the habits. The spread between branches gets its own
 * cultivator instead: `walks 神`, so both questions are answered and neither is mixed
 * into the other.
 */
export const HABITS: readonly Habit[] = [
  { name: 'never fights', checks: 1, minutes: 0, hunts: 0, tower: false, furnace: false, build: false, gear: false,
    branch: 'spirit',
    who: 'Opens it once a day, buys what the qi affords, and never taps a beast.' },
  // 守貢 What the wall actually asks for, stated as a cultivator rather than as an
  // argument: one visit, no tower, no gear, no furnace, and two beasts before bed.
  { name: 'barely fights', checks: 1, minutes: 0, hunts: 2, tower: false, furnace: false,
    build: false, gear: false, branch: 'spirit',
    who: 'The same visit as the one above, and two beasts before putting it down.' },
  { name: 'once a day', gear: true, checks: 1, minutes: 2, hunts: 4, tower: true, furnace: false, build: true,
    branch: 'sword',
    who: 'One visit a day, but the visit counts: a few kills and whatever the tower will give up.' },
  { name: 'casual', gear: true, checks: 3, minutes: 5, hunts: 3, tower: false, furnace: false, build: true,
    cards: 'material',
    branch: 'sword',
    who: 'Three visits, some hunting, never opens the tower.' },
  { name: 'active', gear: true, checks: 6, minutes: 10, hunts: 6, tower: true, furnace: true, build: true,
    branch: 'sword',
    who: 'Six visits, ten minutes each, hunts, climbs and brews.' },
  { name: 'every hour', gear: true, checks: 24, minutes: 15, hunts: 8, tower: true, furnace: true, build: true,
    branch: 'sword',
    who: 'Every waking hour. As played as this game can be played.' },
  // 圍 The worst case for the economy: every spare coin of qi turned into material.
  { name: 'drives it all', gear: true, checks: 6, minutes: 10, hunts: 6, tower: true, cards: 'material',
    furnace: true, build: true, drives: true, branch: 'sword',
    who: 'Plays like the active cultivator and pours every spare coin into 圍 drives.' },
  // 道 The same cultivator as `active`, down the other branch, so the tree's own spread
  // is measured instead of being assumed.
  { name: 'walks 神', gear: true, checks: 6, minutes: 10, hunts: 6, tower: true, cards: 'dao',
    furnace: true, build: true, branch: 'spirit',
    who: 'The active cultivator again, walking 神 the Spirit instead of 劍 the Sword.' },
  // 自 The same cultivator as `active`, leaving 自 the auto-hunt running through each
  // ten-minute visit: four hundred kills a visit at the app's pace (one fight per 1.5 s).
  // It is what found the melting hole (see MELT_FILL), and it stays so the hole stays shut.
  { name: 'runs auto', gear: true, checks: 6, minutes: 10, hunts: 400, tower: true, furnace: true, build: true,
    branch: 'sword',
    who: 'The active cultivator, with Auto left on for the whole of every visit.' },
  // 業 The same cultivator as `active` again, with the workshop never idle and the best
  // elixir and sigil carried into every warden and demon: what the crafts are worth.
  { name: 'crafts it all', gear: true, checks: 6, minutes: 10, hunts: 6, tower: true,
    furnace: true, build: true, branch: 'sword', crafts: true,
    who: 'The active cultivator, with the workshop always running and its kit in every hard fight.' },
];

/** 悟道 Off, for measuring what the cards are actually worth: HABITS_NO_CARDS=1 */
const NO_CARDS = process.env.HABITS_NO_CARDS === '1';

const ARTS_BY_REALM: Record<string, number> = { crane: 3, tiger: 4, wolf: 7 };
/** Which warden leaves each of those arts. */
const ART_WARDEN: Record<string, string> = { crane: 'crane', tiger: 'tiger', wolf: 'direwolf' };

export interface Run {
  readonly habit: Habit;
  readonly days: number;
  readonly arrival: readonly number[];
  /**
   * 層 The day each of the eighty-one rungs opened.
   *
   * `arrival` answers "when did they reach a realm", which was enough while a realm
   * handed over everything it had at the breakthrough. Beasts now walk out at a layer
   * (see Beast.layer), so 曆 the content clock has to ask a finer question, and this is
   * the only honest place to answer it.
   */
  readonly layerDay: readonly number[];
  readonly state: State;
  readonly fights: number;
  readonly reached: number;
  readonly done: boolean;
  readonly power: number;
}

/**
 * 器 What a kill leaves behind, and what the cultivator does with it.
 *
 * This is the other half of the hole the tree came out of: for the whole of the game's
 * life the harness never equipped a single piece. A cultivator who hunts thousands of
 * beasts and wears nothing is not a cultivator, and every curve we printed was walked by
 * one.
 *
 * The rule the fake player follows is the rule a real one follows without thinking:
 * **keep the better piece.** `itemWorth` is the same rough comparison the chest itself
 * uses when it is full, so nothing here knows more than the game does.
 */
function takeDrop(s: State, beast: Beast, seed: number, build?: School | Pair): State {
  // 運 One place builds this now, and building it here by hand is what let two of the
  // harnesses pass 空囊 where the field means 造化. See sim/fortune.ts.
  // 緣 The same two calls the app makes: the bar decides the drop, then moves.
  const found = dropFor(s, beast, seed, fortuneOf(s), s.layer);
  s = noteFate(s, beast, found);
  if (!found) return s;

  // 藏 The same stash() the game uses: 空囊 lifts it, a full chest melts its cast-off.
  const st = stash(s, found);
  let out: State = st.state;
  const item = st.item!;
  if (st.dropped?.id === item.id) return out;    // the chest kept something better

  const slot = templateOf(item).slot as Slot;
  const worn = out.worn[slot];
  // 鑑 Wear it when the game would mark it ▲: the sim says it raises power or qi and
  // lowers neither, read with 承 the levels it would take from the piece it replaces.
  // itemWorth was a rank-and-realm guess, and once the levels travel it would happily
  // swap a refined sword of power for a fan of qi one rank higher.
  if (!worn || wears(out, item, worn, build)) {
    const after = equip(out.worn, out.chest, item, slot);
    out = { ...out, worn: after.worn, chest: [...after.chest] };
  }
  return out;
}

/**
 * 煉 Fuse every three of a kind, and wear what comes out when the game would mark it ▲.
 *
 * A player fuses: the chest puts every group of three in front of them with a button on
 * it. The harness did not, and for a night that hid a real fault. With fusion in, the
 * cultivator arrived at the summit 5% stronger and the old footing (a multiple of 力)
 * walled the eightieth crossing at 45 days one step up from where it passed. The fault
 * was the endgame's, not fusion's: see PILL_AHEAD and TRIBULATION_FOOTING.
 */
function fuseAll(s: State, build?: School | Pair): State {
  for (let i = 0; i < 60; i++) {
    const g = fusable(s.chest)[0];
    if (!g) break;
    const f = fuseIn(s, g.template, g.rarity);
    if (!f.made) break;
    s = f.state;
    const slot = templateOf(f.made).slot as Slot;
    const worn = s.worn[slot];
    if (!worn || wears(s, f.made, worn, build)) {
      const after = equip(s.worn, s.chest, f.made, slot);
      s = { ...s, worn: after.worn, chest: [...after.chest] };
    }
  }
  return s;
}

/**
 * 職 Put the build together from everything owned: for each place on the body the best
 * piece of each wanted school and the best stranger, and of every way of choosing among
 * them the one that meets the build with the most gear. Refining levels travel with the
 * place (承), so a piece is judged by its rank and its realm alone.
 */
function arrange(s: State, build: School | Pair): State {
  const want = quotas(build);
  const schools = Object.keys(want) as School[];
  const owned = [...s.chest, ...SLOTS.map((x) => s.worn[x]).filter((x): x is Item => !!x)];
  const worth = (it: Item) => RARITY_INFO[it.rarity].mult * templateOf(it).realm;
  // Per place: the best piece of each wanted school, then the best stranger. Index k in
  // 0..schools.length-1 is a school, and schools.length is "anything else".
  const opts = SLOTS.map((slot) => {
    const best: (Item | undefined)[] = new Array(schools.length + 1).fill(undefined);
    for (const it of owned) {
      if (templateOf(it).slot !== slot) continue;
      const k = schools.indexOf(schoolOf(it));
      const at = k < 0 ? schools.length : k;
      if (!best[at] || worth(it) > worth(best[at]!)) best[at] = it;
    }
    return best;
  });
  const pick: number[] = new Array(SLOTS.length).fill(-1);
  const chosen: number[] = new Array(SLOTS.length).fill(-1);
  const counts = new Array(schools.length).fill(0);
  let bestScore = -1;
  const walk = (i: number, score: number) => {
    if (i === SLOTS.length) {
      let met = 0;
      for (let k = 0; k < schools.length; k++) met += Math.min(counts[k], want[schools[k]] ?? 0);
      const total = met * 1e9 + score;
      if (total > bestScore) { bestScore = total; for (let j = 0; j < pick.length; j++) chosen[j] = pick[j]; }
      return;
    }
    let any = false;
    for (let k = 0; k <= schools.length; k++) {
      const it = opts[i][k];
      if (!it) continue;
      any = true;
      pick[i] = k;
      if (k < schools.length) counts[k]++;
      walk(i + 1, score + worth(it));
      if (k < schools.length) counts[k]--;
    }
    if (!any) { pick[i] = -1; walk(i + 1, score); }
  };
  walk(0, 0);
  let out = s;
  chosen.forEach((k, i) => {
    const item = k >= 0 ? opts[i][k] : undefined;
    const slot = SLOTS[i];
    if (item && out.worn[slot]?.id !== item.id && out.chest.some((c) => c.id === item.id)) {
      const after = equip(out.worn, out.chest, item, slot);
      out = { ...out, worn: after.worn, chest: [...after.chest] };
    }
  });
  return out;
}

/**
 * 獵 Which beast to hunt: the strongest one that is safe. With a class in mind, the safe
 * one whose three shapes are most of the schools the body is still short of, which is
 * what a player after a class does; a harness that always hunted the strongest beast
 * could never put together a class whose shapes that beast does not leave.
 */
function quarryFor(s: State, build: School | Pair | undefined): Beast | undefined {
  const safe = [...huntable(s.realm, s.layer)].reverse().filter((x) => odds(s, x) > 0.7);
  if (!build || safe.length < 2) return safe[0];
  const want = quotas(build);
  const counts = callingOf(s.worn).counts;
  const short = (b: Beast) => b.leaves.filter((k) => {
    const a = ARCHETYPES.find((x) => x.key === k);
    if (!a) return false;
    const sc = schoolOfAxis(a.affix);
    return (want[sc] ?? 0) > counts[sc];
  }).length;
  return safe.reduce((best, b) => (short(b) > short(best) ? b : best), safe[0]);
}

/**
 * 緣 Answer a meeting if one is waiting: the pick that can be paid for and gives the
 * most, counting 道 and a piece of gear at an hour and two of this cultivator's own qi.
 */
function meetOnce(s: State, seed: number): State {
  const m = meetingDue(s);
  if (!m) return s;
  const hour = rate(s) * 3600;
  const worth = (i: 0 | 1) => {
    const p = m.picks[i];
    if (!canAnswer(s, p)) return -Infinity;
    const g = giftOf(s, p.outcome);
    // 緣 A boon stays for good, so the harness takes one whenever it is offered.
    return g.qi - priceOf(s, p).qi + g.dao * hour + (p.outcome.kind === 'item' ? 2 * hour : 0)
      + (p.outcome.kind === 'boon' ? 8 * hour : 0);
  };
  const which: 0 | 1 = worth(1) > worth(0) ? 1 : 0;
  return answer(s, m.key, which, seed);
}

/** 職 How many of each school a build wants on the body. */
function quotas(build: School | Pair): Partial<Record<School, number>> {
  const pair = PAIRS.find((p) => p.key === build);
  return pair ? { [pair.a]: SCHOOL_WAKES, [pair.b]: SCHOOL_WAKES } : { [build as School]: SLOTS.length };
}

/**
 * 職 Whether to put this piece on over that one. With no build it is the ▲ and nothing
 * else. With one, a piece of a wanted school goes on over a stranger while its school is
 * short, a stranger never goes on over a wanted piece, and between two of the same kind
 * the ▲ decides.
 */
function wears(s: State, item: Item, worn: Item, build: School | Pair | undefined): boolean {
  const better = swing(s, item).better;
  if (!build) return better;
  const want = quotas(build);
  const mine = schoolOf(item), theirs = schoolOf(worn);
  const counts = callingOf(s.worn).counts;
  const wanted = (x: School) => want[x] !== undefined;
  if (wanted(mine) && !wanted(theirs)) return counts[mine] < (want[mine] ?? 0);
  if (!wanted(mine) && wanted(theirs)) return false;
  if (wanted(mine) && wanted(theirs) && mine !== theirs) return false;
  return better;
}

/**
 * 道 Buy down one branch, as far as the points reach.
 *
 * 開 The gate is checked here, and it was not before. Every curve this harness has ever
 * printed was measured with the tree spent from the first realm, while the game does not
 * open it until the second, so the first realm was modelled with 起 The
 * Beginning's +10% rate and a branch's worth of nodes that a real cultivator does not
 * have. The points still accrue from the first realm and still wait, which is the rule;
 * what waits with them now is the spending.
 */
function spendTree(s: State, branch: Path | undefined): State {
  if (!branch || !isOpen(s.realm, 'tree')) return s;
  let out = s;
  for (let guard = 0; guard < 200; guard++) {
    const free = freePoints(out);
    const want = ALL_NODES
      .filter((n) => n.key === 'root' || n.path === branch)
      .find((n) => canUnlock(n.key, out.unlocked, free, isOpen(out.realm, 'keystones')));
    if (!want) break;
    out = { ...out, unlocked: [...out.unlocked, want.key] };
  }
  return out;
}


/**
 * 看 A visit, handed out as it begins, before anything on it has been done.
 *
 * 忙 tools/busy.ts asks a different question of the same walk: not how long the climb
 * takes, but how much there is to do on the way up it. The alternative was a second
 * simulation that plays *almost* the same way, which would answer about a cultivator
 * this game does not have. So there is one walk and it is watched.
 */
export type Watcher = (day: number, s: State) => void;

export function play(h: Habit, maxDays = 400, watch?: Watcher): Run {
  let s = newState(T0);
  let t = T0;
  const tick = DAY / h.checks;
  const arrival = [0];
  const layerDay = [0];
  let fights = 0;
  let arrangedOn = -1;
  // 器 The drops are seeded, so the same habit always finds the same gear.
  let seed = 991;

  while ((t - T0) / DAY < maxDays && layersOpened(s) < LAYERS - 1) {
    // 入定 the part of the visit spent looking at it, walked in steps so the ramp counts.
    const open = h.minutes * 60;
    const deeper = focusBonus(s.unlocked);
    for (let k = 1; k <= 10 && open > 0; k++) {
      s = advance(s, t + (open * k) / 10, false, focusAt((open * k) / 10, deeper));
    }
    t += tick;
    s = advance(s, t);
    if (h.crafts) s = work(s, t);

    watch?.((t - T0) / DAY, s);

    s = spendTree(s, h.branch);

    // 緣 The person on the road. Every cultivator who opens the game meets them, so the
    // harness answers too: the qi, material, 道 and gear they give used to be missing from
    // every curve on the page (found by the coherence audit).
    s = meetOnce(s, ++seed);

    if (h.build) {
      const stance = [...STANCES].reverse().find((x) => x.realm <= s.realm);
      s = {
        ...s,
        stance: stance?.key ?? null,
        sequence: Object.keys(ARTS_BY_REALM).filter((k) => ARTS_BY_REALM[k] <= s.realm),
        // 誠 Only the arts of realms reached. This used to mark all three wardens killed
        // from the first day, which also paid their 道 points two realms early: the
        // harness was the one save validate() now refuses (found by the audit's fix).
        killed: { ...s.killed, ...Object.fromEntries(Object.entries(ART_WARDEN)
          .filter(([art]) => ARTS_BY_REALM[art] <= s.realm).map(([, w]) => [w, Math.max(1, s.killed[w] ?? 0)])) },
      };
    }

    // 凝丹 Stuck at the ceiling with a warden out of reach: the layers are full, so
    // qi has nowhere else to go and the only move left is to condense cores out of it.
    // Everybody does this when cornered; the difference between the habits is how often
    // they are cornered, which is exactly the difference being measured.
    // 業 Somebody who crafts looks at the pouch first: the kit changes the odds, so it
    // changes how many cores they have to condense before the fight looks worth it.
    const kitOf = (x: State) => (h.crafts ? kitFor(x, wardenOf(x.realm), 'warden') : { kit: NO_KIT, spends: false, used: NOT_USED });
    if (canFightWarden(s)) {
      if (h.crafts) s = carryBest(s, wardenOf(s.realm), 'warden');
      for (let i = 0; i < 40; i++) {
        if (odds(s, wardenOf(s.realm), undefined, kitOf(s).kit) > 0.5 || !canCondense(s)) break;
        s = condense(s);
      }
    }

    // 妖 The gate: the warden is fought when the realm is full and it looks worth trying.
    if (canFightWarden(s) && odds(s, wardenOf(s.realm), undefined, kitOf(s).kit) > 0.2) {
      const { spends, used } = kitOf(s);
      s = takeKill(s, wardenOf(s.realm));
      if (spends) s = spendKit(s, used);
      fights++;
    }
    if (canBreakThrough(s)) s = breakThrough(s);

    /**
     * 悟道 The card at the breakthrough, taken the way anybody takes one: the kind this
     * cultivator leans towards, and the first of the three if the trio holds none of it.
     * It is a loop rather than one call because a save can owe more than one.
     */
    for (let i = 0; i < TRIOS.length && !NO_CARDS; i++) {
      const trio = awakeningDue(s);
      if (!trio) break;
      const want = trio.find((c) => c.effect.kind === (h.cards ?? 'salvage')) ?? trio[0];
      s = { ...s, awakened: [...takeAwakening(s.realm, s.awakened, want.key, s.tribulation)] };
    }
    while (arrival.length < s.realm) arrival.push((t - T0) / DAY);
    while (layerDay.length <= layersOpened(s)) layerDay.push((t - T0) / DAY);

    // 職 Somebody building a class looks at the whole chest once a visit, not only at
    // what just fell: a Wanderer holding a Fortune ring and no Sword talisman moves the
    // Fortune line elsewhere to make room. See arrange().
    if (h.gear && h.calling && Math.floor((t - T0) / DAY) !== arrangedOn) {
      s = arrange(s, h.calling);
      arrangedOn = Math.floor((t - T0) / DAY);
    }

    // 閉關 The door, shut whenever it can be, and 心魔 the demon fought when it comes, on
    // a seeded fight like any other. A loss sends it back for DEMON_RETURN; the next visit
    // tries again. Only somebody who fights at all fights this.
    if (h.hunts > 0 && process.env.NF_NODEMON !== '1') {
      if (demonDue(s) && h.crafts) {
        s = carryBest(s, demonOf(s), 'demon', demonPower(s));
        const { kit, spends, used } = kitFor(s, demonOf(s), 'demon');
        if (fight(s, demonOf(s), ++seed, demonPower(s), kit).won) {
          s = soulLocked(s) ? conquerTwice(s) : conquer(s);
          if (spends) s = spendKit(s, used);
        } else s = repel(s);
      }
      if (demonDue(s)) s = fight(s, demonOf(s), ++seed, demonPower(s)).won ? conquer(s) : repel(s);
      s = seclude(s);
    }

    for (let i = 0; i < h.hunts; i++) {
      // 解 One kill a visit, at most, goes to a beast the knife does not know yet: learning
      // is done on the way, never instead of the hunt.
      const b = (h.crafts && i === 0 ? toLearn(s, huntable(s.realm, s.layer).filter((x) => odds(s, x) > 0.7)) : undefined)
        ?? quarryFor(s, h.calling);
      if (!b) break;
      s = takeKill(s, b);
      if (h.gear) s = takeDrop(s, b, ++seed, h.calling);
      if (h.gear) s = fuseAll(s, h.calling);
      fights++;
    }

    // 圍 Drives, bought with whatever the ladder is not about to need. The rule is
    // deliberately greedy: spend down to one rung of headroom, because the question
    // being asked is what the *worst* case does to the climb, not what a careful
    // player does.
    if (h.drives) for (let i = 0; i < 40; i++) {
      const b = [...huntable(s.realm, s.layer)].reverse().find((x) => canDrive(s, x));
      if (!b) break;
      // Stuck at a ceiling with a warden they cannot beat, qi has nowhere else to go,
      // so it all goes here. Otherwise they keep one rung of headroom and drive the
      // rest, which is still far greedier than anybody would really play.
      const stuck = atCeiling(s) && !s.wardenFell;
      const keep = stuck ? 0 : ladderBetween(layersOpened(s));
      const n = [...DRIVE_SIZES].reverse().find((x) => s.qi - driveCost(s, x, b) >= keep);
      if (!n) break;
      const d = drive(s, b, n, ++seed);
      s = d.state;
      fights += n;
    }

    /**
     * 秘境 The door, walked the way a visit walks it: in when it is open, and as far as
     * it goes. A beast that puts them down ends it, which is the only thing that can.
     *
     * 全 It walks the whole path on purpose. A run abandoned early is worth a fraction
     * of one finished, so walking all seven rooms is the most a run can ever be worth
     * to a habit, and the most is what a harness should be measuring.
     */
    if (canEnter(s)) {
      s = enterSecret(s);
      for (let r = 0; r < roomsFor(s.realm) + 2 && insideSecret(s); r++) {
        // 擇 The door with the better of the two on offer, read the way a player reads
        // it: a fight they are likely to win is worth more than a cache, and one they
        // are likely to lose is worth nothing at all.
        const doors = doorsAt(s, s.runStep);
        const worth = doors.map((d) => {
          const g = secretGift(s, d, s.runStep);
          if (g.fight) return odds(s, g.fight) > 0.7 ? 3 : 0;
          return g.dao ? 4 : g.item ? 2 : 1;
        });
        s = openDoor(s, (worth[1] > worth[0] ? 1 : 0), ++seed);
      }
      if (insideSecret(s)) s = leaveSecret(s);
    }

    /**
     * 洞天 The cave, worked the way a visit works it: take whatever is ripe, then fill
     * the empty beds with the longest herb this cultivator can afford.
     *
     * 長 The longest on purpose, and it is the worst case for the economy rather than
     * the best play: a twelve-hour herb is the best rate in the cave and the least
     * forgiving to somebody who is not there, so a harness that always plants it is
     * measuring the most a cave can ever be worth to each habit.
     */
    if (isOpen(s.realm, 'cave')) {
      s = harvestAll(s);
      for (let i = 0; i < BEDS; i++) {
        const want = [...plantable(s)].reverse().find((h) => canPlant(s, i, h.key));
        if (want) s = plant(s, i, want.key);
      }
    }

    // 業 The workshop, last thing on the visit: settle it, cut arrays into the floor, set
    // it on something that will still be running when they are back, and wear a forged
    // piece the moment the game would mark it ▲, as with anything that falls.
    if (h.crafts) {
      s = craftVisit(s, t, tick);
      for (const it of s.chest.filter((x) => x.from === FORGED)) {
        const slot = templateOf(it).slot as Slot;
        const worn = s.worn[slot];
        if (!worn || wears(s, it, worn, h.calling)) {
          const after = equip(s.worn, s.chest, it, slot);
          s = { ...s, worn: after.worn, chest: [...after.chest] };
        }
      }
    }

    // 拆 And on a visit, the junk goes. A cultivator who picks gear up is a cultivator
    // who melts what they will never wear: anything at or below 靈 Spirit, which is
    // the rank the game stops caring about within a realm of finding it.
    if (h.gear && isOpen(s.realm, 'gear')) s = salvageUpTo(s, 'spirit');

    /**
     * 煉器 Refining, which the harness could not see until 煉器 moved to the second
     * realm and somebody checked whether anything was measuring it.
     *
     * It was opening at the eighth realm, where the tower already pays material in
     * bulk, so nothing on any curve ever turned on it. It now opens with gear, which
     * makes it an **uncapped power source running the whole length of the climb**, and
     * a reward the harnesses cannot see is a reward nobody can tell you is wrong.
     *
     * The rule the fake player follows is the one a real one follows: pour it into the
     * best piece you own, and keep back what 妖丹 a core costs, because from the third
     * realm a warden will not fall without one. So the two sinks compete, which is the
     * decision the early game did not have.
     */
    if (h.gear && isOpen(s.realm, 'refine')) for (let i = 0; i < 60; i++) {
      const keep = isOpen(s.realm, 'cores') && canBuy(s, 'cores') ? upgradeCost(s, 'cores') : 0;
      const slot = SLOTS.filter((x) => s.worn[x] && canRefine(s, x))
        .sort((a, b) => itemWorth(s.worn[b]!) - itemWorth(s.worn[a]!))[0];
      if (!slot) break;
      const price = refinePrice(s, slot);
      if (price === null || s.materials - price < keep) break;
      s = refine(s, slot);
    }

    if (h.tower) for (let i = 0; i < 40; i++) {
      const f = standingFloor(s);
      if (odds(s, floorBeast(f), floorPower(f)) < 0.65) break;
      s = clearFloor(s, f);
      fights++;
    }

    for (let g = 0; g < 400; g++) {
      const open2 = UPGRADES.filter((u) => canBuy(s, u));
      if (!open2.length) break;
      open2.sort((a, b) => upgradeCost(s, a) - upgradeCost(s, b));
      s = buy(s, open2[0]);
    }
    // 爐 Pills when the warden is out of reach, and none once it is beatable: qi brewed
    // is qi that did not open a layer.
    if (h.furnace && (h.brews ?? 'stuck') === 'stuck') for (let g = 0; g < 400; g++) {
      if (odds(s, wardenOf(s.realm)) > 0.6) break;
      const line = (['body', 'bane'] as const).find((l) => canBrew(s, l));
      if (!line) break;
      s = brew(s, line);
    }
    // 塔 The other policy: brew toward the floor that will not fall, because a floor is
    // six hours of gathering and a pill is a share of one rung.
    if (h.furnace && h.brews === 'tower') for (let g = 0; g < 400; g++) {
      const f = standingFloor(s);
      if (odds(s, floorBeast(f), floorPower(f)) > 0.65) break;
      const line = (['bane', 'body'] as const).find((l) => canBrew(s, l));
      if (!line) break;
      s = brew(s, line);
    }
  }

  return {
    habit: h, days: (t - T0) / DAY, arrival, layerDay, state: s, fights,
    reached: s.realm, done: layersOpened(s) >= LAYERS - 1, power: power(s),
  };
}

/** Every habit, played out. */
export function playAll(): readonly Run[] {
  return HABITS.map((h) => play(h));
}
