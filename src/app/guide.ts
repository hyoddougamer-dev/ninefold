import { UPGRADES, UPGRADE_INFO, atCeiling, canBreakThrough, power, type State } from '../sim/state.ts';
import { MARKS } from '../sim/record.ts';
import { commonsOf, wardenOf } from '../data/bestiary.ts';
import { beastPower } from '../sim/combat.ts';
import { GUIDE } from './copy.ts';

/**
 * 引 The first session, one step at a time.
 *
 * Bruno asked for an interactive tutorial, and the first realm now has a loop worth
 * teaching: kill something, take the material, buy power with it, kill something bigger.
 * A wall of text at the start cannot teach that. Five numbered steps that each complete
 * when the player *does the thing* can.
 *
 * Three properties, and all three come from one decision — **nothing about this is
 * stored**:
 *
 *   1. It cannot desynchronise. The current step is the first one that is not true yet,
 *      computed from the save on every render. There is no cursor to get stuck.
 *   2. It cannot repeat. Every condition below is monotonic — a level bought, a beast
 *      killed, a realm climbed — so once a step is done it is done for the life of the
 *      save, and the guide ends the moment the last one is.
 *   3. It cannot be wrong about a save it did not create. Paste in a ninth-realm save
 *      and every step is already true, so the guide simply is not there.
 *
 * It never blocks: it is one card at the top of 修 Cultivate with a number on it, and
 * the game runs behind it. When it finishes, 示 the advice line takes over for good —
 * the guide is the same idea with a beginning and an end.
 */
export interface Step {
  readonly key: string;
  readonly han: string;
  readonly title: string;
  readonly text: string;
  /** Where the doing happens, if it is not this screen. */
  readonly tab?: 'hunt' | 'trials' | 'gear' | 'dao';
  /**
   * 圖 The picture of the thing being asked for, drawn from the same icon set the game
   * draws it with everywhere else. A step that says "go and kill 山鼠" and shows the rat
   * is recognised on the hunt screen; one that shows nothing has to be read twice.
   */
  readonly art: string;
  /**
   * 尺 How close the player is, 0 to 1, where the step is about closing a gap.
   *
   * The second step asks for a kill the player cannot make for an hour or two. Without
   * this it is a sentence that does not change; with it, it is a bar that creeps every
   * time a level lands or a layer opens, which is the one thing the first hour has to
   * give somebody to watch.
   */
  readonly toward?: (s: State) => number;
  /**
   * 指 The thing on the screen to point at, by its `data-coach` name.
   *
   * This is what turns the card from a paragraph into a tutorial: 指 the Coach draws a
   * ring and an arrow on whatever this names, and the player presses the ring. It is a
   * function of the save rather than a constant because the last step points at three
   * different buttons depending on how far along the realm is — the ladder while there
   * are rungs left, the warden once it is standing there, 突破 once it has fallen.
   *
   * Returning undefined is allowed and means "nothing to point at right now", which is
   * the honest answer whenever the target is on a tab the player is not looking at.
   */
  readonly at?: (s: State) => string | undefined;
  /** True once the player has done it. Every one of these only ever goes from false to true. */
  readonly done: (s: State) => boolean;
}

/** The first realm's own three, in the order they come into reach. */
const FIRST = commonsOf(1);

const killsOf = (s: State) => Object.values(s.killed);

export const STEPS: readonly Step[] = [
  {
    key: 'buy', han: '買', title: GUIDE.buy.title, text: GUIDE.buy.text,
    art: UPGRADE_INFO.technique.icon,
    // 劍訣 is one of the two the opening purse can already afford, and it is the one
    // that leads to the next step, so it is the box the arrow lands on.
    at: () => 'upg-technique',
    done: (s) => UPGRADES.some((u) => s.levels[u] > 0),
  },
  {
    key: 'kill', han: '狩', title: GUIDE.kill.title, text: GUIDE.kill.text, tab: 'hunt',
    art: FIRST[0].icon,
    toward: (s) => Math.max(0, Math.min(1, power(s) / beastPower(FIRST[0]))),
    at: () => 'beast-first',
    done: (s) => killsOf(s).some((n) => n > 0),
  },
  {
    key: 'core', han: '妖丹', title: GUIDE.core.title, text: GUIDE.core.text,
    art: UPGRADE_INFO.cores.icon,
    at: () => 'upg-cores',
    done: (s) => s.levels.cores > 0,
  },
  {
    key: 'mark', han: '熟', title: GUIDE.mark.title, text: GUIDE.mark.text, tab: 'hunt',
    art: FIRST[0].icon,
    toward: (s) => Math.max(...killsOf(s), 0) / MARKS[1],
    at: () => 'beast-first',
    done: (s) => killsOf(s).some((n) => n >= MARKS[1]),
  },
  {
    key: 'climb', han: '突破', title: GUIDE.climb.title, text: GUIDE.climb.text,
    art: wardenOf(1).icon,
    // Three buttons over the life of one step. While there are rungs left there is
    // nothing to press, so it points at 梯 the ladder instead: the thing Bruno said he
    // could not read is exactly the thing this step is waiting on.
    at: (s) => (canBreakThrough(s) ? 'breakthrough'
      : atCeiling(s) && !s.wardenFell ? 'fight-warden'
      : 'ladder'),
    done: (s) => s.realm > 1,
  },
];

/**
 * Which step the player is on, and how far along — or nothing, once they are past it.
 *
 * 急 With one exception, and it was found by playing: a cultivator who filled the realm
 * while the guide was still on the fourth step sat at nine layers of nine with a warden
 * in front of them, a quarter of a million qi banked, and one line on the screen telling
 * them to go and kill ten more rats. It held them there for nineteen hours.
 *
 * A guide that can hold a player back is worse than no guide. So when the realm is full
 * and the warden is still standing, that is the step — whatever number it is. Nothing is
 * skipped: the steps behind it are not marked done, and if the warden wins the guide
 * goes straight back to where it was.
 */
export function guide(s: State): { step: Step; n: number; of: number } | null {
  const i = STEPS.findIndex((x) => !x.done(s));
  if (i < 0) return null;
  const last = STEPS.length - 1;
  if (atCeiling(s) && !s.wardenFell && !STEPS[last].done(s)) {
    return { step: STEPS[last], n: last + 1, of: STEPS.length };
  }
  return { step: STEPS[i], n: i + 1, of: STEPS.length };
}
