import { daoEarned, daoFree } from './dao.ts';
import { daoPoints } from './awaken.ts';
import { layersOpened } from './time.ts';
import { filledRealms, type State } from './state.ts';
import { WARDENS } from '../data/bestiary.ts';

/**
 * 點 The 道 points a cultivator has earned and not yet spent.
 *
 * It lives here because two things have to agree about it and one of them was silent.
 * 道 the tab bar has worn the count for a while, and 示 the line of advice never
 * mentioned it: measured, on **100% of visits where a cultivator held unspent points**,
 * the advice pointed somewhere else, every time at 狩 the hunt, while the player carried
 * up to twelve points. Bruno was carrying eleven and being told to go and tap a bat.
 *
 * `daoFree` takes the four numbers rather than the State, on purpose, so that state.ts
 * can read dao.ts without the two importing each other. That is the right shape for
 * dao.ts and the wrong shape for a caller, so the assembly happens once, here.
 */
function wardensDown(s: State): number {
  return Object.entries(s.killed)
    .filter(([k, n]) => n > 0 && WARDENS.some((w) => w.key === k)).length;
}

/** Every point this cultivator has ever earned, cards included. */
export function earnedPoints(s: State): number {
  // 緣 A point given by somebody on the road is earned exactly like any other, so it is
  // added here and nowhere else. See sim/meet.ts.
  return daoEarned(layersOpened(s), wardensDown(s), filledRealms(s),
    daoPoints(s.awakened) + Math.max(0, s.metPoints));
}

export function freePoints(s: State): number {
  return daoFree(layersOpened(s), wardensDown(s), s.unlocked, filledRealms(s),
    daoPoints(s.awakened) + Math.max(0, s.metPoints));
}
