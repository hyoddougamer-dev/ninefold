import { UPGRADES, atTribulation, capOf, type State } from '../sim/state.ts';
import { canBrew, canRefine, standingFloor } from '../sim/trials.ts';
import { floorBeast, floorPower } from '../sim/tower.ts';
import { odds } from '../sim/combat.ts';
import { BEASTS } from '../data/bestiary.ts';
import { MARKS } from '../sim/record.ts';
import { SLOTS } from '../data/gear.ts';
import { NOTICE } from './copy.ts';

/**
 * 新 The cards that arrive once.
 *
 * 示 the advice line answers "why am I stuck". This answers the other half: "what is
 * this thing that just appeared". The realm cap, 無盡塔 the tower, 丹爐 the furnace and
 * 雷池 the thunder pool all turn up in a game that had never mentioned them, and a
 * player meeting a screen with no idea what it is for will use it wrong or not at all.
 *
 * Three rules, so this never becomes a tutorial:
 *
 *   1. **It fires when the thing is true, not when the game starts.** Nobody reads a
 *      card about the furnace before there is a furnace.
 *   2. **It fires once, ever.** The key goes in the save and never comes out.
 *   3. **It never blocks.** The card sits at the foot of the screen and the game carries
 *      on behind it.
 */
export interface Notice {
  readonly key: string;
  readonly han: string;
  readonly title: string;
  readonly text: string;
  /** Is this true yet? */
  readonly when: (s: State) => boolean;
  /** Where to send the player, if there is somewhere. */
  readonly tab?: 'hunt' | 'trials' | 'gear' | 'dao';
}

export const NOTICES: readonly Notice[] = [
  {
    key: 'cap', han: '上限', title: NOTICE.cap.title, text: NOTICE.cap.text,
    when: (s) => UPGRADES.some((u) => s.levels[u] >= capOf(s)),
  },
  {
    key: 'cores', han: '妖丹', title: NOTICE.cores.title, text: NOTICE.cores.text, tab: 'hunt',
    when: (s) => s.realm >= 2 && s.levels.cores === 0,
  },
  {
    key: 'tower', han: '塔', title: NOTICE.tower.title, text: NOTICE.tower.text, tab: 'trials',
    when: (s) => s.tower === 0
      && odds(s, floorBeast(standingFloor(s)), floorPower(standingFloor(s))) > 0.6,
  },
  {
    key: 'furnace', han: '爐', title: NOTICE.furnace.title, text: NOTICE.furnace.text, tab: 'trials',
    when: (s) => canBrew(s, 'body'),
  },
  {
    key: 'refine', han: '煉器', title: NOTICE.refine.title, text: NOTICE.refine.text, tab: 'gear',
    when: (s) => SLOTS.some((slot) => canRefine(s, slot)),
  },
  {
    key: 'record', han: '錄', title: NOTICE.record.title, text: NOTICE.record.text, tab: 'hunt',
    when: (s) => BEASTS.some((b) => (s.killed[b.key] ?? 0) >= MARKS[1]),
  },
  {
    key: 'pool', han: '雷池', title: NOTICE.pool.title, text: NOTICE.pool.text,
    when: (s) => s.realm === 9 && (atTribulation(s) || s.layer >= 8),
  },
];

/** The next card to show, or nothing — which is the usual answer. */
export function nextNotice(s: State): Notice | null {
  return NOTICES.find((n) => !s.seen.includes(n.key) && n.when(s)) ?? null;
}
