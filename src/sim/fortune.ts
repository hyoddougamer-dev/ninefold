import { alwaysDrops, dropChanceBonus, rarityLuck } from './dao.ts';
import { dropBonus, luckBonus } from './awaken.ts';
import { pillFortune } from './furnace.ts';
import type { Fortune } from './drops.ts';
import type { State } from './state.ts';
import { classDrop, gearFind, gearLuck } from './schools.ts';
import { BOON_FAMILIAR, DROP_LUCK_CAP, DROP_TO_LUCK } from './balance.ts';
import { hasBoon } from '../data/meetings.ts';

/**
 * 運 Everything that bends what falls off a beast, added up in one place.
 *
 * Four things bend it now: 道 the tree, 丹 the fortune pills, 悟道 the cards taken at a
 * breakthrough, and 造化 Creation, which makes every beast drop something. Before this
 * module there were four copies of the sum, in App.tsx twice and in two harnesses, and
 * they had already drifted: one of them multiplied the pills in and the others did not.
 *
 * A fifth source is coming sooner or later, and a fifth copy is not.
 *
 * 誤 And the copies had drifted in a second way, which is what centralising them found.
 * `always` means 造化 Creation, where every beast drops something. Two of the four
 * copies were passing `dropsRankUp`, which is 空囊 and lifts a drop a rank rather than
 * making one happen, and both of those copies were in the harnesses. So every curve
 * printed with a finished 運 branch was measuring a cultivator whose beasts all dropped
 * when they should not have, and whose drops were never lifted a rank when they should
 * have been. Neither of those is what the game does.
 */
export function fortuneOf(s: State): Fortune {
  // 運拾 The body's own two lines, bent, and 獵王 the Hunt King's extra chance.
  // 鴉 And the two crows from the road.
  const chance = dropChanceBonus(s.unlocked) + dropBonus(s.awakened) + gearFind(s) + classDrop(s)
    + (hasBoon(s, 'familiar') ? BOON_FAMILIAR : 0);
  const always = alwaysDrops(s.unlocked);
  return {
    chance,
    // 造化 With Creation every kill drops already, so the chance turns into luck.
    luck: (rarityLuck(s.unlocked) * pillFortune(s.brewed) + luckBonus(s.awakened)) * gearLuck(s)
      + (always ? chanceAsLuck(chance) : 0),
    always,
  };
}

/** 造化 The luck a drop chance becomes once Creation has made it redundant: DROP_TO_LUCK. */
export function chanceAsLuck(chance: number): number {
  return Math.min(DROP_LUCK_CAP, Math.max(0, chance) * DROP_TO_LUCK);
}
