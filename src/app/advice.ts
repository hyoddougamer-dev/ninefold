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
import { freePoints } from '../sim/points.ts';
import { due as awakeningDue } from '../sim/awaken.ts';
import { ripeCount as ripeBeds } from '../sim/cave.ts';
import { canUnlock } from '../sim/dao.ts';
import { ALL_NODES } from '../data/techniques.ts';
import { canRefine } from '../sim/trials.ts';
import { clampRefine, refineCost } from '../sim/refine.ts';
import { SLOTS, templateOf } from '../data/gear.ts';

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

/**
 * 煉器 How many refine levels the material has to buy before the line says so.
 *
 * Levels double in price, so three is already about seven times the next one: material
 * has to have properly outrun the spending before this outranks 狩 the hunt.
 */
const PILING = 3;

/** The odds below which a fight is worth explaining rather than worth trying. */
const STUCK = 0.35;

/** And the odds above which a Dragon needs no comment. Below it, the furnace is the answer. */
const DRAGON_COMFORT = 0.85;

/** The 煉體 pill by the name this realm's furnace actually sells it under. */
function bodyPill(s: State): string {
  return pillOf('body', s.realm).han;
}

/**
 * 道 Points earned, not spent, and a node actually within reach to spend them on.
 *
 * Both halves matter. Points with nothing reachable to buy is not a thing to do, and
 * telling a player to go and spend what they cannot spend is worse than silence.
 */
function pointsWaiting(s: State): number {
  if (!isOpen(s.realm, 'tree')) return 0;
  const free = freePoints(s);
  if (free <= 0) return 0;
  const reachable = ALL_NODES
    .some((n) => canUnlock(n.key, s.unlocked, free, isOpen(s.realm, 'keystones')));
  return reachable ? free : 0;
}

/** 煉器 The piece worth pouring material into, if any of them can take a level now. */
function refinable(s: State): string | null {
  if (!isOpen(s.realm, 'refine')) return null;
  const slot = SLOTS.find((x) => s.worn[x] && canRefine(s, x));
  return slot ? templateOf(s.worn[slot]!).han : null;
}

export function advice(s: State): Advice | null {
  const warden = currentWarden(s);
  const blocked = canFightWarden(s) && odds(s, warden) < STUCK;

  /**
   * 道 Free points come before everything, including being blocked.
   *
   * This is the only thing in the game that costs nothing and is always an improvement,
   * so nothing can outrank it. Measured before it existed: on **100% of visits where a
   * cultivator held unspent points**, this function pointed somewhere else, every time
   * at 狩 the hunt, while they carried as many as twelve. Bruno was carrying eleven,
   * looking at a line telling him to go and kill a bat seven more times.
   */
  /**
   * 悟道 And before even that, a card owed.
   *
   * It is free, it is permanent, and it is the only thing in the game the player cannot
   * get later by climbing: the offer waits, but nothing else happens until it is taken.
   */
  if (awakeningDue(s.realm, s.awakened)) return { han: '悟道', text: ADVICE.awaken };

  /**
   * 洞天 A ripe bed, which costs nothing and is gone the moment it is taken.
   *
   * Under 悟道 because a card is permanent and a bed comes round again, and above the
   * points because a ripe bed is one tap and spending points is a screen.
   */
  const ripe = ripeBeds(s);
  if (ripe > 0) return { han: '洞天', text: ADVICE.ripe(ripe) };

  const waiting = pointsWaiting(s);
  if (waiting > 0) return { han: '道', text: ADVICE.freePoints(waiting), tab: 'dao' };

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
    // 煉器 Cores are full and the technique is at its cap, so the material coming off
    // the beasts has exactly one place left to go, and it is the one with no ceiling.
    const piece = refinable(s);
    if (piece) return { han: '煉器', text: ADVICE.refineCapped, tab: 'gear' };
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
   * honest line is the other one: 煉體 is the only pill the Dragon feels, and brewing
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
    const piece = refinable(s);
    if (piece) return { han: '煉器', text: ADVICE.refineCapped, tab: 'gear' };
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
   * the time, which is most of the game, and all of the quiet stretches a player
   * actually complains about. A line that only speaks when you are stuck tells a player
   * that not being stuck means there is nothing to do.
   *
   * So below it there is always something: a beast you can take, a level you can afford,
   * a beast you cannot take yet *and the power it wants*, or the next thing the mountain
   * will hand you and the realm that hands it over. A target with a number on it is
   * gameplay; an empty screen is not.
   */
  const mine = power(s);

  /**
   * 煉器 Material piling up, with somewhere uncapped to put it.
   *
   * This sits **above** the hunt line, and that took a measurement to settle. Below it
   * the line never fired once in three realms, because there is nearly always some
   * beast with a mark left in it and 狩 answered first every single time. A system
   * nothing ever points at is a system a player does not know they have, which is the
   * whole of what is being fixed here.
   *
   * What keeps it from shouting is the threshold rather than the order: it wants
   * material for **three levels** on the piece, over and above the 妖丹 core a warden
   * will ask for, which is the point at which hunting has genuinely outrun spending.
   */
  const piece = refinable(s);
  if (piece) {
    const slot = SLOTS.find((x) => s.worn[x] && canRefine(s, x))!;
    const coreRoom = !isOpen(s.realm, 'cores') || s.levels.cores >= capOf(s, 'cores')
      ? 0 : upgradeCost(s, 'cores');
    // 數 How many levels the material really buys, keeping back the core. Levels double,
    // so this is a short loop and never a long one.
    let spare = s.materials - coreRoom;
    let level = clampRefine(s.worn[slot]!.refine);
    let levels = 0;
    while (levels < 20 && spare >= refineCost(level)) { spare -= refineCost(level); level++; levels++; }
    if (levels >= PILING) return { han: '煉器', text: ADVICE.refine(piece, levels), tab: 'gear' };
  }

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

  // 望 Nothing is in reach, so name what is nearest, and the power it asks for.
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
