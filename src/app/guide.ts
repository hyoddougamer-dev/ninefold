import {
  UPGRADES, UPGRADE_INFO, atCeiling, canBreakThrough, canBuy, power, upgradeCost,
  type State,
} from '../sim/state.ts';
import { MARKS } from '../sim/record.ts';
import { LAYERS_PER_REALM } from '../sim/balance.ts';
import { progress } from '../sim/time.ts';
import { commonsOf, wardenOf } from '../data/bestiary.ts';
import { beastPower, oddsRaw } from '../sim/combat.ts';
import { isOpen } from '../sim/unlocks.ts';
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
  /**
   * 時 Can the player actually do this, right now?
   *
   * Bruno, after playing the arrow version: *"as coisas ficam stuck e nao saem e devem
   * aparecer na altura que os players tiverem prestes a desbloquear esse acontecimento."*
   *
   * He had found the hole. The second step says "go and kill the rat" from the first
   * second of the game, and the rat is not winnable for about twelve minutes. So for
   * twelve minutes the card asked for something impossible and the ring pulsed on a
   * fight that could not be won — a tutorial that has stopped teaching and is now just
   * in the way.
   *
   * A step that is not ready is not the instruction. It is the *next* instruction, and
   * the card says so, shows how close it is, and hands the player something they can do
   * in the meantime. Nothing is ever skipped and nothing is ever unreachable: a step
   * with no `ready` is ready always.
   */
  readonly ready?: (s: State) => boolean;
  /**
   * What the card says and points at while `ready` is false.
   *
   * This is the half that keeps it interactive. "You cannot do this yet" on its own is
   * a locked door; "you cannot do this yet, so buy this instead, and here is how close
   * you are" is still a game.
   */
  readonly waiting?: {
    readonly text: string;
    readonly tab?: 'hunt' | 'trials' | 'gear' | 'dao';
    readonly at?: (s: State) => string | undefined;
  };
  /** True once the player has done it. Every one of these only ever goes from false to true. */
  readonly done: (s: State) => boolean;
}

/**
 * 買 The box the player can afford right now, if there is one.
 *
 * It is the answer to "what do I do while I wait", three times over, because in the
 * first realm spending qi is the only thing that closes any of the gaps: more power
 * reaches the beast, more rate fills the rung, and both of them are bought here.
 */
export function nowBuyable(s: State): string | undefined {
  const u = UPGRADES.find((x) => (x !== 'cores' || isOpen(s.realm, 'cores')) && canBuy(s, x));
  return u && `upg-${u}`;
}

/** The first realm's own three, in the order they come into reach. */
const FIRST = commonsOf(1);

const killsOf = (s: State) => Object.values(s.killed);

export const STEPS: readonly Step[] = [
  {
    key: 'buy', han: '買', title: GUIDE.buy.title, text: GUIDE.buy.text,
    art: UPGRADE_INFO.technique.icon,
    // Whichever box the purse can actually reach, not a box chosen in advance. The
    // arrow must never land on something that is greyed out.
    at: (s) => nowBuyable(s),
    done: (s) => UPGRADES.some((u) => s.levels[u] > 0),
  },
  {
    key: 'kill', han: '狩', title: GUIDE.kill.title, text: GUIDE.kill.text, tab: 'hunt',
    art: FIRST[0].icon,
    toward: (s) => Math.max(0, Math.min(1, power(s) / beastPower(FIRST[0]))),
    // 時 Not until the fight can be won. The rat is about twelve minutes away at the
    // start, and for those twelve minutes this step was pointing a pulsing ring at a
    // fight with no winning seed in it.
    ready: (s) => oddsRaw(s, FIRST[0]) > 0,
    waiting: { text: GUIDE.kill.waiting, at: (s) => nowBuyable(s) },
    at: () => 'beast-first',
    done: (s) => killsOf(s).some((n) => n > 0),
  },
  {
    key: 'core', han: '妖丹', title: GUIDE.core.title, text: GUIDE.core.text,
    art: UPGRADE_INFO.cores.icon,
    toward: (s) => Math.min(1, s.materials / Math.max(1, upgradeCost(s, 'cores'))),
    ready: (s) => canBuy(s, 'cores'),
    // Material only falls off things you kill, so the waiting half of this step sends
    // the player hunting rather than leaving them looking at a box they cannot buy.
    waiting: { text: GUIDE.core.waiting, tab: 'hunt', at: () => 'beast-first' },
    at: () => 'upg-cores',
    done: (s) => s.levels.cores > 0,
  },
  {
    key: 'mark', han: '熟', title: GUIDE.mark.title, text: GUIDE.mark.text, tab: 'hunt',
    art: FIRST[0].icon,
    toward: (s) => Math.max(...killsOf(s), 0) / MARKS[1],
    ready: (s) => oddsRaw(s, FIRST[0]) > 0,
    waiting: { text: GUIDE.mark.waiting, at: (s) => nowBuyable(s) },
    at: () => 'beast-first',
    done: (s) => killsOf(s).some((n) => n >= MARKS[1]),
  },
  {
    key: 'climb', han: '突破', title: GUIDE.climb.title, text: GUIDE.climb.text,
    art: wardenOf(1).icon,
    toward: (s) => Math.min(1, (s.layer + progress(s)) / LAYERS_PER_REALM),
    // The warden is not there until the ninth rung is paid for. Until then this is a
    // thing to watch, not a thing to do, so it waits like the others.
    ready: (s) => atCeiling(s),
    waiting: { text: GUIDE.climb.waiting, at: (s) => nowBuyable(s) },
    at: (s) => (canBreakThrough(s) ? 'breakthrough' : 'fight-warden'),
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
export interface Guiding {
  readonly step: Step;
  readonly n: number;
  readonly of: number;
  /** False while the step's own action is not possible yet. */
  readonly ready: boolean;
  /** What to draw the ring on right now, or nothing when there is nothing to press. */
  readonly at: string | null;
  /** Where the chevron goes, which is not the step's tab while it is waiting. */
  readonly tab?: 'hunt' | 'trials' | 'gear' | 'dao';
  /** The line to read, which is the waiting line while it is waiting. */
  readonly text: string;
}

export function guide(s: State): Guiding | null {
  // 退 The player can put it away. It is one key in the same list the notices use, so
  // it survives a reload, and 引 in the help panel brings it back.
  if (s.seen.includes(DISMISSED)) return null;

  const i = STEPS.findIndex((x) => !x.done(s));
  if (i < 0) return null;
  const last = STEPS.length - 1;
  const n = atCeiling(s) && !s.wardenFell && !STEPS[last].done(s) ? last : i;
  const step = STEPS[n];

  const ready = step.ready ? step.ready(s) : true;
  const at = (ready ? step.at?.(s) : step.waiting?.at?.(s)) ?? null;
  return {
    step,
    n: n + 1,
    of: STEPS.length,
    ready,
    at,
    tab: ready ? step.tab : step.waiting?.tab,
    text: ready ? step.text : step.waiting?.text ?? step.text,
  };
}

/** The key that hides the guide, kept in the same seen-list the notices use. */
export const DISMISSED = 'guide';
