import { currentWarden, odds } from '../sim/combat.ts';
import {
  UPGRADES, UPGRADE_INFO, atTribulation, canBuy, canFightWarden, capOf, power, upgradeCost,
  type State,
} from '../sim/state.ts';
import { ladderDone } from '../sim/time.ts';
import { stanceOf, sequenceOf } from '../sim/arts.ts';
import { canBrew, standingFloor, towerOpen } from '../sim/trials.ts';
import { SYSTEMS, isOpen } from '../sim/unlocks.ts';
import { realm as realmOf } from '../data/realms.ts';
import { huntable } from '../data/bestiary.ts';
import { beastPower } from '../sim/combat.ts';
import { MARK_INFO, nextMark } from '../sim/record.ts';
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
  /**
   * 尺 How close the player is, 0 to 1, when the line is about closing a gap.
   *
   * A sentence saying "it stands at 力 2.4 and you are at 力 1" is true and takes a
   * moment to parse. The same fact as a bar is read at a glance and, more to the point,
   * is watched: it moves every time a level lands or a layer opens, which is exactly
   * what the first hour needs a player to notice.
   */
  readonly toward?: number;
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
  const blocked = canFightWarden(s) && odds(s, warden) < STUCK;

  if (blocked) {
    const cap = capOf(s, 'technique');
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
    s.levels[u] >= capOf(s, u) || (u === 'cores' && !isOpen(s.realm, 'cores')));
  if (allCapped && !ladderDone(s)) {
    // What to do with a full realm depends on what the realm has opened.
    if (isOpen(s.realm, 'furnace')) return { han: '爐', text: ADVICE.cappedSoSpend, tab: 'trials' };
    if (isOpen(s.realm, 'tower')) return { han: '塔', text: ADVICE.cappedSoClimb, tab: 'trials' };
    const soon = SYSTEMS.find((x) => x.realm > s.realm);
    if (soon) {
      return { han: '境', text: ADVICE.cappedSoClimbRealm(realmOf(soon.realm).han, realmOf(soon.realm).name) };
    }
  }

  /**
   * 續 And from here it is never silent.
   *
   * Everything above answers *what is blocking you*, and returned nothing the rest of
   * the time — which is most of the game, and all of the quiet stretches a player
   * actually complains about. A line that only speaks when you are stuck tells a player
   * that not being stuck means there is nothing to do.
   *
   * So below it there is always something: a beast you can take, a level you can afford,
   * a beast you cannot take yet *and the power it wants*, or the next thing the mountain
   * will hand you and the realm that hands it over. A target with a number on it is
   * gameplay; an empty screen is not.
   */
  const mine = power(s);

  // 狩 The strongest thing you can actually beat, if it still has a mark left in it.
  if (isOpen(s.realm, 'hunt')) {
    const reachable = [...huntable(s.realm, s.layer)]
      .sort((a, b) => beastPower(b) - beastPower(a))
      .find((b) => nextMark(s.killed[b.key] ?? 0) && odds(s, b) >= 0.6);
    if (reachable) {
      const mark = nextMark(s.killed[reachable.key] ?? 0)!;
      return {
        han: '狩',
        text: ADVICE.goHunt(reachable.han, Math.round(odds(s, reachable) * 100),
          mark.at - (s.killed[reachable.key] ?? 0), MARK_INFO[mark.index].han),
        tab: 'hunt',
      };
    }
  }

  // 買 Something on the cultivate screen is affordable right now.
  const affordable = UPGRADES.find((u) =>
    (u !== 'cores' || isOpen(s.realm, 'cores')) && canBuy(s, u));
  if (affordable) {
    return {
      han: UPGRADE_INFO[affordable].han,
      text: ADVICE.canAfford(UPGRADE_INFO[affordable].han, UPGRADE_INFO[affordable].name),
    };
  }

  // 望 Nothing is in reach — so name what is nearest, and the power it asks for.
  if (isOpen(s.realm, 'hunt')) {
    const next = [...huntable(s.realm, s.layer)]
      .sort((a, b) => beastPower(a) - beastPower(b))
      .find((b) => odds(s, b) < 0.6);
    if (next) {
      return {
        han: '狩', text: ADVICE.reachFor(next.han, beastPower(next), mine), tab: 'hunt',
        toward: Math.max(0, Math.min(1, mine / beastPower(next))),
      };
    }
  }

  // 開 Otherwise point at the next thing the climb will hand over, and say what it is.
  const coming = SYSTEMS.find((x) => x.realm > s.realm);
  if (coming) {
    const r = realmOf(coming.realm);
    return { han: coming.han, text: ADVICE.opensSoon(coming.han, coming.name, r.han, r.name, coming.gives) };
  }

  // 頂 Past the last system there is one thing left, and it is the whole endgame.
  return { han: '雷池', text: ADVICE.theTop };
}
