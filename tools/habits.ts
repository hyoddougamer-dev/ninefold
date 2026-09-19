/**
 * 勤 The habit harness: five cultivators with the same game and different lives.
 *
 * It lives here rather than in a test because two things read it — `players.test.ts`,
 * which asserts the order and prints the table on every run, and `bible.ts`, which puts
 * the same table on the page. A measurement that appears twice has to be made once.
 */
import { LAYERS, focusAt } from '../src/sim/balance.ts';
import {
  UPGRADES, atCeiling, breakThrough, buy, canBreakThrough, canBuy, newState, power,
  upgradeCost, type State,
} from '../src/sim/state.ts';
import { advance, layersOpened } from '../src/sim/time.ts';
import { loot, odds } from '../src/sim/combat.ts';
import { huntable, wardenOf } from '../src/data/bestiary.ts';
import { STANCES } from '../src/data/arts.ts';
import { brew, canBrew, clearFloor, lootTaken, standingFloor } from '../src/sim/trials.ts';
import { floorBeast, floorPower } from '../src/sim/tower.ts';

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
  readonly tower: boolean;
  readonly furnace: boolean;
  readonly build: boolean;
  /** One line for the page: who this is. */
  readonly who: string;
}

export const HABITS: readonly Habit[] = [
  { name: 'never fights', checks: 1, minutes: 0, hunts: 0, tower: false, furnace: false, build: false,
    who: 'Opens it once a day, buys what the qi affords, and never taps a beast.' },
  { name: 'once a day', checks: 1, minutes: 2, hunts: 4, tower: true, furnace: false, build: true,
    who: 'One visit a day, but the visit counts: a few kills and whatever the tower will give up.' },
  { name: 'casual', checks: 3, minutes: 5, hunts: 3, tower: false, furnace: false, build: true,
    who: 'Three visits, some hunting, never opens the tower.' },
  { name: 'active', checks: 6, minutes: 10, hunts: 6, tower: true, furnace: true, build: true,
    who: 'Six visits, ten minutes each, hunts, climbs and brews.' },
  { name: 'every hour', checks: 24, minutes: 15, hunts: 8, tower: true, furnace: true, build: true,
    who: 'Every waking hour. As played as this game can be played.' },
];

const ARTS_BY_REALM: Record<string, number> = { crane: 3, tiger: 4, wolf: 7 };

export interface Run {
  readonly habit: Habit;
  readonly days: number;
  readonly arrival: readonly number[];
  readonly state: State;
  readonly fights: number;
  readonly reached: number;
  readonly done: boolean;
  readonly power: number;
}

export function play(h: Habit, maxDays = 400): Run {
  let s = newState(T0);
  let t = T0;
  const tick = DAY / h.checks;
  const arrival = [0];
  let fights = 0;

  while ((t - T0) / DAY < maxDays && layersOpened(s) < LAYERS - 1) {
    // 入定 the part of the visit spent looking at it, walked in steps so the ramp counts.
    const open = h.minutes * 60;
    for (let k = 1; k <= 10 && open > 0; k++) {
      s = advance(s, t + (open * k) / 10, false, focusAt((open * k) / 10));
    }
    t += tick;
    s = advance(s, t);

    if (h.build) {
      const stance = [...STANCES].reverse().find((x) => x.realm <= s.realm);
      s = {
        ...s,
        stance: stance?.key ?? null,
        sequence: Object.keys(ARTS_BY_REALM).filter((k) => ARTS_BY_REALM[k] <= s.realm),
        killed: { ...s.killed, crane: 1, tiger: 1, direwolf: 1 },
      };
    }

    // 妖 The gate: the warden is fought when the realm is full and it looks worth trying.
    if (atCeiling(s) && !s.wardenFell && odds(s, wardenOf(s.realm)) > 0.2) {
      s = { ...s, wardenFell: true, killed: { ...s.killed, [wardenOf(s.realm).key]: 1 } };
      fights++;
    }
    if (canBreakThrough(s)) s = breakThrough(s);
    while (arrival.length < s.realm) arrival.push((t - T0) / DAY);

    for (let i = 0; i < h.hunts; i++) {
      const b = [...huntable(s.realm)].reverse().find((x) => odds(s, x) > 0.7);
      if (!b) break;
      s = { ...s, materials: s.materials + lootTaken(s, loot(b)) };
      fights++;
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
    if (h.furnace) for (let g = 0; g < 400; g++) {
      if (odds(s, wardenOf(s.realm)) > 0.6) break;
      const line = (['body', 'bane'] as const).find((l) => canBrew(s, l));
      if (!line) break;
      s = brew(s, line);
    }
  }

  return {
    habit: h, days: (t - T0) / DAY, arrival, state: s, fights,
    reached: s.realm, done: layersOpened(s) >= LAYERS - 1, power: power(s),
  };
}

/** Every habit, played out. */
export function playAll(): readonly Run[] {
  return HABITS.map((h) => play(h));
}
