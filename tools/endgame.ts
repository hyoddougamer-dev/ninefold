/**
 * 劫 The endgame harness: the tribulation played out, crossing by crossing.
 *
 * It lives here for the same reason `habits.ts` does: two things read it. Those are
 * `tribulation.test.ts`, which asserts the pace and prints the table on every run, and
 * `bible.ts`, which puts the same numbers on the page. A measurement that appears twice
 * has to be made once, and the endgame's numbers were typed into the bible by hand until
 * a change to the furnace made every one of them wrong at a stroke.
 */
import { currentWarden, effectiveBeastPower, odds } from '../src/sim/combat.ts';
import {
  buy, canBuy, canCross, crossTribulation, tribulationPool, type State,
} from '../src/sim/state.ts';
import { rate } from '../src/sim/time.ts';
import { brew, canBrew, canRefine, clearFloor, pillPrice, refine, standingFloor } from '../src/sim/trials.ts';
import { SLOTS } from '../src/data/gear.ts';
import { cardDue, take as takeCard } from '../src/sim/awaken.ts';
import { floorBeast, floorPower } from '../src/sim/tower.ts';
import { heavenAt } from '../src/data/heavens.ts';
import { HABITS, play as playHabit } from './habits.ts';

/**
 * 境外 What stands there is no longer one animal.
 *
 * It was `wardenOf(9)` (the 龍) for every crossing, which is exactly the thing the
 * heavens were built to stop. The harness now asks the same question the screen asks,
 * `currentWarden(s)`, so a measurement taken here is a measurement of what a player
 * actually faces.
 */

/** Every warden, so the arts the climb earned are all in hand at the top. */
const ALL_WARDENS = {
  fox: 1, ape: 1, crane: 1, tiger: 1, turtle: 1, golem: 1, direwolf: 1, jiao: 1,
};

/** The odds at which this cultivator is willing to face the Dragon. */
export const WILLING = 0.55;

/**
 * The cultivator who actually reaches the top, and not an idea of one.
 *
 * This used to be built by hand: realm 9, a day's qi, six hundred upgrade taps and
 * `brewed: 81` of every line. The pill count was the tell. It was there to skip past
 * first-realm pill prices, because the furnace used to start at the foot of the mountain
 * however late it opened, and without the skip the fixture had no power to speak of.
 *
 * 爐底 PILL_RUNG fixed the prices, and then the hand-built cultivator fell apart: no
 * gear, no 道 tree, no 妖丹 cores, 2.55M power against a Dragon of 81.1M. It could not
 * climb a floor, could not afford a pill, and sat there for four hundred days. That is
 * not the endgame being a wall; that is the fixture not being a player.
 *
 * So the endgame is measured on somebody who played the game to get here: the `active`
 * habit, which is the same cultivator the curve and the bible are written from.
 */
let ARRIVED: State | null = null;

export function arrived(): State {
  // Ninety days of simulation is a few seconds, and nothing about it varies, so it is
  // run once per process rather than once per reader.
  if (!ARRIVED) {
    const active = HABITS.find((h) => h.name === 'active')!;
    const s = playHabit(active).state;
    ARRIVED = { ...s, killed: { ...s.killed, ...ALL_WARDENS } };
  }
  return ARRIVED;
}

export interface Endgame {
  /** Days waited for each crossing, in order. */
  readonly days: readonly number[];
  /** The tower floor standing at each crossing. */
  readonly floors: readonly number[];
  /** The odds the crossing was actually taken at. */
  readonly chances: readonly number[];
  /** 境外 The heaven each crossing opened into, by its 漢字. */
  readonly heavens: readonly string[];
  readonly end: State;
}

/**
 * Plays the endgame loop as a person plays it: gather qi, climb the tower for materials,
 * brew what the furnace will sell, face the Dragon, cross.
 *
 * This is the only honest measurement of the endgame, because the endgame is not one
 * system. The Dragon grows a fixed step a crossing; a mark pays back most of it; the
 * furnace is the only thing at the top that qi still buys, and the tower is the only
 * thing that feeds the furnace. Take any one of the four away and the ladder becomes a
 * wall, which is exactly what it was before the tower and the furnace existed.
 */
/**
 * 悟道 Which way this cultivator leans when a heaven offers three cards.
 *
 * 境外 The nine heavens each owe one, and a harness that never took them would be
 * measuring a game nobody plays. It is a parameter rather than a constant because the
 * whole point of a card is that two cultivators end up different, and the only way to
 * know whether one lean runs away with the endgame is to play all of them.
 */
export type Lean = 'pill' | 'tower' | 'material' | 'luck' | 'refine' | 'salvage' | 'none';

/** Take whatever is owed, leaning the way this cultivator leans. */
function takeOwed(s: State, lean: Lean): State {
  let out = s;
  for (let i = 0; i < 20; i++) {
    const trio = cardDue(out);
    if (!trio || lean === 'none') break;
    const want = trio.find((c) => c.effect.kind === lean) ?? trio[0];
    out = { ...out, awakened: [...takeCard(out.realm, out.awakened, want.key, out.tribulation)] };
  }
  return out;
}

export function playEndgame(marks: number, lean: Lean = 'pill'): Endgame {
  let s = takeOwed(arrived(), lean);
  const days: number[] = [];
  const floors: number[] = [];
  const chances: number[] = [];
  const heavens: string[] = [];

  for (let m = 0; m < marks; m++) {
    let waited = 0;
    for (let day = 0; day < 400; day++) {
      if (odds(s, currentWarden(s)) > WILLING && canCross({ ...s, wardenFell: true })) break;
      s = { ...s, qi: s.qi + rate(s) * 86_400 };
      waited += 1;

      // The tower, while the next floor is worth trying. Losing costs nothing, so the
      // only question is whether the build clears it.
      for (let i = 0; i < 200; i++) {
        const floor = standingFloor(s);
        if (odds(s, floorBeast(floor), floorPower(floor)) < 0.6) break;
        s = clearFloor(s, floor);
      }

      // Then the spending, in the order a person would: the capped upgrades first
      // because they are finite, then 煉體 while the Dragon is still out of reach, and
      // only what is left over the pool on the other two lines. Qi brewed is qi not
      // pooled, so a cultivator who brews everything never crosses anything.
      for (let i = 0; i < 4000; i++) {
        const u = (['technique', 'cores', 'method', 'pills'] as const).find((x) => canBuy(s, x));
        if (!u) break;
        s = buy(s, u);
      }
      /**
       * 煉器 And then the material, which had nowhere to go in this harness at all.
       *
       * 量 It was found by the heavens' cards and it is the same fault 爐 the furnace
       * had: a policy the harness never wrote down, hiding a whole system. The loop
       * gathered, climbed and brewed, and never refined, so 材 material only ever went
       * up. Measured at forty marks it ended on **2.2e29**, which is not a cultivator
       * with plenty, it is a currency with no sink in it, and every card that pays
       * material read as worth exactly nothing because in this harness it was.
       *
       * A real cultivator refines: it is where 示 the advice line sends them the moment
       * the capped upgrades are full, and it is the only sink the game has left at the
       * top. So the loop does what the player does, and the measurement is of the game.
       */
      for (let i = 0; i < 4000; i++) {
        const slot = SLOTS.find((x) => s.worn[x] && canRefine(s, x));
        if (!slot) break;
        s = refine(s, slot);
      }
      const short = odds(s, currentWarden(s)) <= WILLING;
      for (let i = 0; i < 4000; i++) {
        if (short) {
          if (!canBrew(s, 'body')) break;
          s = brew(s, 'body');
          continue;
        }
        const spare = s.qi - tribulationPool(s);
        const line = (['bane', 'fortune'] as const)
          .find((l) => canBrew(s, l) && pillPrice(s, l).qi <= spare);
        if (!line) break;
        s = brew(s, line);
      }
    }
    days.push(waited);
    floors.push(s.tower);
    chances.push(odds(s, currentWarden(s)));
    s = crossTribulation({ ...s, wardenFell: true }, effectiveBeastPower(s, currentWarden(s)));
    heavens.push(heavenAt(s.tribulation)?.han ?? '');
    // 悟道 A heaven owes a card, and the card is taken the moment the crossing opens it.
    s = takeOwed(s, lean);
  }
  return { days, floors, chances, heavens, end: s };
}
