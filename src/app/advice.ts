import { currentWarden, odds } from '../sim/combat.ts';
import {
  UPGRADES, UPGRADE_INFO, atCeiling, atTribulation, canBuy, capOf, upgradeCost,
  type State,
} from '../sim/state.ts';
import { ladderDone } from '../sim/time.ts';
import { stanceOf, sequenceOf } from '../sim/arts.ts';
import { canBrew, standingFloor, towerOpen } from '../sim/trials.ts';
import { SYSTEMS, isOpen } from '../sim/unlocks.ts';
import { realm as realmOf } from '../data/realms.ts';
import { floorBeast, floorPower } from '../sim/tower.ts';
import { pillOf } from '../data/alchemy.ts';
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

/** And the odds above which a Dragon needs no comment. Below it, the furnace is the answer. */
const DRAGON_COMFORT = 0.85;

/** The 煉體 pill by the name this realm's furnace actually sells it under. */
function bodyPill(s: State): string {
  return pillOf('body', s.realm).han;
}

export function advice(s: State): Advice | null {
  const warden = currentWarden(s);
  const blocked = (atCeiling(s) || atTribulation(s)) && !s.wardenFell
    && odds(s, warden) < STUCK;

  if (blocked) {
    const cap = capOf(s);
    // Never point at a door the realm has not opened yet.
    if (!isOpen(s.realm, 'cores')) {
      return s.levels.technique < cap && canBuy(s, 'technique')
        ? { han: '劍訣', text: ADVICE.buyTechnique }
        : { han: '劍訣', text: ADVICE.waitTechnique(upgradeCost(s, 'technique')) };
    }
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
    if (canBrew(s, 'body')) return { han: '爐', text: ADVICE.brew(bodyPill(s)), tab: 'trials' };
    if (towerOpen(s)) return { han: '塔', text: ADVICE.climbForMaterial, tab: 'trials' };
    return { han: '狩', text: ADVICE.huntForMaterial, tab: 'hunt' };
  }

  /**
   * 立 The Dragon is standing and the odds are not comfortable.
   *
   * This is the whole endgame decision and it needs saying, because nothing above it
   * fires: `blocked` wants the odds under 35% and a crossing settles in the sixties, so
   * a cultivator looking at a 66% Dragon was told to go and climb a tower floor. The
   * honest line is the other one — 煉體 is the only pill the Dragon feels, and brewing
   * one is what turns 66% into 70%.
   */
  if (atTribulation(s) && !s.wardenFell && odds(s, warden) < DRAGON_COMFORT && canBrew(s, 'body')) {
    const text = ADVICE.brewForDragon(bodyPill(s), Math.round(odds(s, warden) * 100));
    return { han: '爐', text, tab: 'trials' };
  }

  // Nothing is blocking. Is there something plainly worth doing?
  if (towerOpen(s)) {
    const floor = standingFloor(s);
    if (odds(s, floorBeast(floor), floorPower(floor)) > 0.65) {
      return { han: '塔', text: ADVICE.floorWaiting(floor), tab: 'trials' };
    }
  }
  // 妖丹 does not count as uncapped before the realm that sells it: otherwise a first
  // realm cultivator with three boxes half full reads as "nothing left to buy".
  const allCapped = UPGRADES.every((u) =>
    s.levels[u] >= capOf(s) || (u === 'cores' && !isOpen(s.realm, 'cores')));
  if (allCapped && !ladderDone(s)) {
    // What to do with a full realm depends on what the realm has opened.
    if (isOpen(s.realm, 'furnace')) return { han: '爐', text: ADVICE.cappedSoSpend, tab: 'trials' };
    if (isOpen(s.realm, 'tower')) return { han: '塔', text: ADVICE.cappedSoClimb, tab: 'trials' };
    const soon = SYSTEMS.find((x) => x.realm > s.realm);
    if (soon) {
      return { han: '境', text: ADVICE.cappedSoClimbRealm(realmOf(soon.realm).han, realmOf(soon.realm).name) };
    }
  }
  return null;
}
