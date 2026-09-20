/**
 * 階 The climb harness: the theoretical curve, for a cultivator who spends.
 *
 * Shared, like `habits.ts` and `endgame.ts`, because `curve.test.ts` asserts the shape
 * and `bible.ts` prints it. The bible used to carry these numbers typed in by hand, and
 * a change to the furnace made all of them wrong at once without a single test noticing.
 */
import { LAYERS } from '../src/sim/balance.ts';
import { UPGRADES, buy, canBuy, newState, upgradeCost } from '../src/sim/state.ts';
import { advance, layersOpened } from '../src/sim/time.ts';
import { brew, canBrew, clearFloor, standingFloor } from '../src/sim/trials.ts';
import { floorBeast, floorPower } from '../src/sim/tower.ts';
import { odds } from '../src/sim/combat.ts';
import { LINES } from '../src/data/alchemy.ts';

const T0 = 1_700_000_000;
const DAY = 86_400;

/**
 * A cultivator who opens the app `checks` times a day and buys whatever they can.
 *
 * `brews` is the second half of the question. 丹爐 the furnace is the one thing qi buys
 * that no realm caps, so a cultivator who pours everything into it is the fastest way
 * the curve could possibly be broken — and the schedule has to survive them too.
 *
 * `climbs` is separate from it on purpose. The furnace eats materials, so a brewer has
 * to climb 無盡塔 the tower, and the tower pays qi — which means a brewer measured
 * against somebody who does neither is two changes at once, and says nothing about the
 * furnace. To ask what the furnace costs, hold the tower still and change only the
 * brewing.
 */
export function climb(checks: number, spends = true, brews = false, climbs = brews) {
  const tick = DAY / checks;
  let s = newState(T0);
  let t = T0;
  const arrival = [0];
  const buys: number[] = [];

  for (let i = 0; i < checks * 400 && layersOpened(s) < LAYERS - 1; i++) {
    t += tick;
    s = advance(s, t, true);                 // theoretical curve: the warden falls at once
    while (arrival.length < s.realm) arrival.push((t - T0) / DAY);
    if (!spends) continue;
    // Cheapest first, for as long as anything is affordable: the way a person plays.
    for (let guard = 0; guard < 500; guard++) {
      const open = UPGRADES.filter((u) => u !== 'cores' && canBuy(s, u));
      if (open.length === 0) break;
      open.sort((a, b) => upgradeCost(s, a) - upgradeCost(s, b));
      s = buy(s, open[0]);
      buys.push((t - T0) / DAY);
    }
    // The furnace eats materials as well as qi, and materials come from the tower. A
    // cultivator who wants to brew has to climb, so the brewer climbs.
    if (climbs) for (let guard = 0; guard < 40; guard++) {
      const floor = standingFloor(s);
      if (odds(s, floorBeast(floor), floorPower(floor)) < 0.6) break;
      s = clearFloor(s, floor);
    }
    if (!brews) continue;
    for (let guard = 0; guard < 500; guard++) {
      const line = LINES.find((l) => canBrew(s, l));
      if (!line) break;
      s = brew(s, line);
    }
  }
  return { arrival, buys, state: s, days: (t - T0) / DAY };
}
