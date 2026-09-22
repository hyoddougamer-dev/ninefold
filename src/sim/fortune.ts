import { alwaysDrops, dropChanceBonus, rarityLuck } from './dao.ts';
import { dropBonus, luckBonus } from './awaken.ts';
import { pillFortune } from './furnace.ts';
import type { Fortune } from './drops.ts';
import type { State } from './state.ts';

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
  return {
    chance: dropChanceBonus(s.unlocked) + dropBonus(s.awakened),
    luck: rarityLuck(s.unlocked) * pillFortune(s.brewed) + luckBonus(s.awakened),
    always: alwaysDrops(s.unlocked),
  };
}
