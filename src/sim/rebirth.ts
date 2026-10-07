/**
 * 轉世 Rebirth.
 *
 * Bruno: *"from a certain realm onward you can reset, but the benefit of the reset depends
 * on how far ahead you are."*
 *
 * Testers who reach the summit and cross the Dragon report that nothing is left but the
 * clock: a mark every five days or so, for ever. This is the other road from the top. A
 * cultivator who has crossed at least REBIRTH_MARKS may begin again in the first realm,
 * and the life they leave is written into the record (State.lives). What it leaves them is:
 *
 *   宿慧 the Echo, a share on top of the qi gathered, read off how far the life went (the
 *        marks it crossed, a step for every doubling: see echo.ts). Under ECHO_CEILING
 *        across every life, for ever, because nothing uncapped may raise the qi rate.
 *   世   a title, one for each life lived, derived from the record.
 *   榜   the records already on the boards, which the server keeps as the best ever.
 *   譜   the codex: every Hundredfold set any life finished, at the best rank it reached
 *        (State.codexKept). Bruno, 2026-10-07: *"o codex não deve reset, seria injusto."*
 *        The bonuses it gives are the ones a first life had, under the same caps, and none
 *        of them touches the qi rate. The steps for pieces worn are about the pieces worn
 *        now, so those begin again with the gear.
 *   and who the cultivator is (相), the notices already read, the chest's filters, and the
 *   few counters that only ever move forward (the vault's paths walked, the last Realm Key,
 *   the week's quarry), so a new life cannot take twice what a week gives once.
 *
 * Everything else begins again: realm, layers, qi, upgrades, gear, refining, the Path,
 * the cards, the road, the beds, the workshop. It is never forced and never nagged, and
 * nothing is lost by not doing it: the old life goes on crossing as it always did.
 *
 * Pure, like the rest of sim/: a state and an instant in, a state out.
 */
import { LAYERS, LIVES_MAX, REBIRTH_MARKS } from './balance.ts';
import { echoOf, lifeEcho, type Life } from './echo.ts';
import { codexToKeep } from './hundred.ts';
import { layersOpened, newState, type State } from './state.ts';

export { echoOf, lifeEcho };

/** 轉世 Whether this life may end here: the summit, and the first Dragon crossed. */
export function canReincarnate(s: State): boolean {
  return s.realm === 9 && layersOpened(s) >= LAYERS - 1
    && s.tribulation >= REBIRTH_MARKS && (s.lives?.length ?? 0) < LIVES_MAX;
}

/**
 * 深 How far ahead this life is: the marks it has crossed. The smallest honest set. The
 * realm is already the summit for any life that may end, the heaven is read off the marks
 * (heavensOpened), and the tower is left out on purpose: a floor is checked against the
 * body that won it, and once a life ends that body is gone, so a floor claimed for a life
 * that ended is one nobody could check. A mark is time (the pool), which the server can.
 */
export function depthOf(s: State): number {
  return s.tribulation;
}

/** 宿慧 The Echo every life together would give if this one ended now. */
export function echoAfter(s: State): number {
  return echoOf([...(s.lives ?? []), { marks: depthOf(s), at: s.at }]);
}

/** 世 Which life this is: 1 for the first. */
export function lifeOf(s: State): number {
  return (s.lives?.length ?? 0) + 1;
}

/** 世 The instant this life began, in seconds: the end of the last one, or the start. */
export function lifeStart(s: State): number {
  const lives = s.lives ?? [];
  return lives.length ? Math.max(s.startedAt, lives[lives.length - 1].at) : s.startedAt;
}

/**
 * 生 The state a life begins as, given the record it is born with and an instant. One
 * function, read by reincarnate() and by the server (verify.ts), so what the game does and
 * what the server measures from cannot be two different new lives. `kept` is the codex it
 * is born with: what the life it leaves had finished, unless the caller already knows.
 */
export function bornFrom(prev: State, lives: readonly Life[], now: number, kept: readonly number[] = codexToKeep(prev)): State {
  const fresh = newState(now);
  return {
    ...fresh,
    startedAt: prev.startedAt,
    self: prev.self,
    seen: prev.seen,
    filters: prev.filters,
    // Counters that only move forward, so a new life cannot be paid twice for one week.
    keyDay: prev.keyDay,
    quarryWeek: prev.quarryWeek,
    runs: prev.runs,
    lives,
    // 譜 The codex, for good: the best rank every set was finished at, in any life.
    codexKept: kept,
  };
}

/**
 * 轉世 End this life and begin the next. Refused (the same state back) unless the life
 * may end: see canReincarnate.
 */
export function reincarnate(s: State, now: number): State {
  if (!canReincarnate(s)) return s;
  const at = Math.max(s.at, now);
  return bornFrom(s, [...(s.lives ?? []), { marks: depthOf(s), at }], at);
}

/** 世 The title a life carries, by how many lives came before it. None for a first life. */
export const LIFE_TITLES: readonly { readonly han: string; readonly name: string }[] = [
  { han: '再世', name: 'Twice-Born' },
  { han: '三世', name: 'Thrice-Born' },
  { han: '四世', name: 'Four Times Born' },
  { han: '五世', name: 'Five Times Born' },
  { han: '六世', name: 'Six Times Born' },
  { han: '七世', name: 'Seven Times Born' },
  { han: '八世', name: 'Eight Times Born' },
  { han: '九世', name: 'Nine Times Born' },
  { han: '十世', name: 'Ten Times Born' },
];

/** 世 This life's title, or null for a first life. */
export function lifeTitle(s: State): { readonly han: string; readonly name: string } | null {
  const n = s.lives?.length ?? 0;
  return n > 0 ? LIFE_TITLES[Math.min(n, LIFE_TITLES.length) - 1] : null;
}
