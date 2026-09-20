import { currentWarden, odds } from '../sim/combat.ts';
import {
  UPGRADES, UPGRADE_INFO, atCeiling, atTribulation, canBuy, capOf, upgradeCost,
  type State,
} from '../sim/state.ts';
import { ladderDone } from '../sim/time.ts';
import { stanceOf, sequenceOf } from '../sim/arts.ts';
import { canBrew, standingFloor } from '../sim/trials.ts';
import { floorBeast, floorPower } from '../sim/tower.ts';
import { ADVICE } from './copy.ts';

/**
 * 示 One line telling the player the most useful thing they could do next.
 *
 * It exists because of a wall this game deliberately built and then failed to explain.
 * From the third realm a warden will not fall without 妖丹 cores, and cores are bought
 * with 材 material, and material only falls off beasts. A player who has never opened
 * 狩 Hunt meets that wall, loses a fight they cannot read, and has nothing anywhere
 * telling them why. They stop playing, and they are right to.
 *
 * So this is not a tutorial and it is not a quest log. It is one sentence, computed from
 * the state, that appears when there is something specific worth saying and says nothing
 * at all the rest of the time. The order below is the order of *what is blocking you*,
 * not the order of what is cheapest.
 */
export interface Advice {
  readonly han: string;
  readonly text: string;
  /** Which tab it is about, so the screen can point at it. */
  readonly tab?: 'hunt' | 'trials' | 'dao' | 'gear';
}

/** The odds below which a fight is worth explaining rather than worth trying. */
const STUCK = 0.35;

export function advice(s: State): Advice | null {
  const warden = currentWarden(s);
  const blocked = (atCeiling(s) || atTribulation(s)) && !s.wardenFell
    && odds(s, warden) < STUCK;

  if (blocked) {
    const cap = capOf(s);
    // 妖丹 first, always. It is the one upgrade qi cannot buy, and it is the one that
    // stops a waiting cultivator dead.
    if (s.levels.cores < cap) {
      return canBuy(s, 'cores')
        ? { han: '妖丹', text: ADVICE.buyCores(UPGRADE_INFO.cores.han) }
        : { han: '狩', text: ADVICE.needMaterial(upgradeCost(s, 'cores') - s.materials), tab: 'hunt' };
    }
    if (s.levels.technique < cap) {
      return canBuy(s, 'technique')
        ? { han: '劍訣', text: ADVICE.buyTechnique }
        : { han: '劍訣', text: ADVICE.waitTechnique(upgradeCost(s, 'technique')) };
    }
    if (!stanceOf(s)) return { han: '勢', text: ADVICE.noStance, tab: 'dao' };
    if (sequenceOf(s).every((a) => a === null)) {
      return { han: '訣', text: ADVICE.noSequence, tab: 'dao' };
    }
    if (canBrew(s, 'body')) return { han: '爐', text: ADVICE.brew, tab: 'trials' };
    return { han: '塔', text: ADVICE.climbForMaterial, tab: 'trials' };
  }

  // Nothing is blocking. Is there something plainly worth doing?
  const floor = standingFloor(s);
  if (odds(s, floorBeast(floor), floorPower(floor)) > 0.65) {
    return { han: '塔', text: ADVICE.floorWaiting(floor), tab: 'trials' };
  }
  const allCapped = UPGRADES.every((u) => s.levels[u] >= capOf(s));
  if (allCapped && !ladderDone(s)) {
    return { han: '爐', text: ADVICE.cappedSoSpend, tab: 'trials' };
  }
  return null;
}
