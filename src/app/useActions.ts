import { useCallback, type Dispatch, type SetStateAction } from 'react';
import type { Line } from '../data/alchemy.ts';
import { templateOf, type Item, type Rarity, type Slot } from '../data/gear.ts';
import type { State } from '../sim/state.ts';
import { brew, brewMax, refine } from '../sim/trials.ts';
import { wearBetter } from '../sim/inspect.ts';
import { capRefuses, fuseAllIn, fuseIn, limitFor } from '../sim/stash.ts';
import { equip as equipItem, unequip as unequipItem } from '../sim/chest.ts';
import { salvage, salvageUpTo } from '../sim/salvage.ts';
import { canUnlock, capstonesOpen } from '../sim/dao.ts';
import { freePoints as freeOf } from '../sim/points.ts';
import { isOpen } from '../sim/unlocks.ts';
import { swapFork } from '../sim/fork.ts';
import { burst, float } from './juice.ts';
import { JUICE, QOL } from './copy.ts';
import { haptics } from './haptics.ts';
import { sfx } from './sound.ts';

/**
 * 手 The game's actions, the handlers the screens call when a player taps. Each one changes
 * the save through setState and plays what the change earned once, for the tap that made it
 * (see useOnce). They take no value from the render: they are the same functions for the
 * life of the screen, which is why they are memoised with no dependencies.
 */
export function useActions(
  setState: Dispatch<SetStateAction<State>>,
  tap: () => number,
  once: (id: number, effect: () => void) => void,
) {
  const onBrew = useCallback((line: Line, max = false) => {
    const id = tap();
    setState((s) => {
      // 盡 ×Max brews as many as can be paid for, each at its own price (brewMax).
      const next = max ? brewMax(s, line).state : brew(s, line);
      if (next === s) return s;
      once(id, () => { sfx.brew(); haptics.win(); });
      return next;
    });
  }, []);

  /** ▲ 著 Put on every ▲ piece in the chest at once. */
  const onWearAll = useCallback(() => {
    const id = tap();
    setState((s) => {
      const r = wearBetter(s);
      if (r.worn > 0) once(id, () => { float(QOL.gear.wore(r.worn), 'gold'); burst('gold', null, 12, 64); sfx.buy(); haptics.strike(); });
      return r.state;
    });
  }, []);

  /** 煉 Fuse every group of three until none is left. */
  const onFuseAll = useCallback(() => {
    const id = tap();
    setState((s) => {
      const r = fuseAllIn(s);
      if (r.state !== s) once(id, () => { float(QOL.gear.fused(r.made.length), 'gold'); burst('gold', null, 16, 80); sfx.breakthrough(); haptics.win(); });
      return r.state;
    });
  }, []);

  const onEquip = useCallback((item: Item) => {
    sfx.buy();
    haptics.tap();
    setState((s) => {
      const next = equipItem(s.worn, s.chest, item, templateOf(item).slot);
      return { ...s, worn: next.worn, chest: [...next.chest] };
    });
  }, []);

  const onUnequip = useCallback((slot: Slot) => {
    setState((s) => {
      const next = unequipItem(s.worn, s.chest, slot, limitFor(s));
      if (next.refused) return s;   // a full chest has nowhere to put it
      return { ...s, worn: next.worn, chest: [...next.chest] };
    });
    sfx.tap();
    haptics.tap();
  }, []);

  /** 煉器 Refining spends material on the place of a piece you are wearing; the level stays with the place. */
  const onRefine = useCallback((slot: Slot) => {
    const id = tap();
    setState((s) => {
      const next = refine(s, slot);
      if (next === s) return s;
      once(id, () => { float(JUICE.refined, 'gold'); burst('gold', null, 10, 56); sfx.buy(); haptics.strike(); });
      return next;
    });
  }, []);

  const onFuse = useCallback((template: string, rarity: string) => {
    const id = tap();
    setState((s) => {
      const next = fuseIn(s, template, rarity as Item['rarity']);
      if (!next.made) return s;
      once(id, () => { float(JUICE.fused, 'gold'); burst('gold', null, 16, 80); });
      return next.state;
    });
    sfx.breakthrough();
    haptics.win();
  }, []);

  /**
   * 手 Everything 修 the screen does, applied to the state the app is holding now.
   *
   * It used to take a finished state: the screen computed `buy(state, u)` from the props
   * of its last render and this put it over whatever the clock had done since. The bar
   * survived that, because every second of it is re-derived from the stamp in the save,
   * but anything else that landed inside the same fifth of a second did not. Now the
   * screen hands over the change and the change is applied to the current state, which
   * is the pattern every other handler in this file already used.
   */
  const climb = useCallback((make: (s: State) => State) => {
    setState((s) => make(s));
    sfx.buy();
    haptics.tap();
  }, []);

  /** 拆 Melting one piece, from the sheet where it can be looked at first. */
  const onSalvage = useCallback((id: string) => {
    setState((s) => salvage(s, [id]));
    sfx.buy();
    haptics.strike();
  }, []);

  /** 拆 And the bulk form: everything at or below a rank, in one tap. */
  const onSalvageAll = useCallback((upTo: Rarity) => {
    setState((s) => salvageUpTo(s, upTo));
    burst('jade', null, 14, 70);
    sfx.buy();
    haptics.strike();
  }, []);

  const onUnlock = useCallback((key: string) => {
    const id = tap();
    setState((s) => {
      const free = freeOf(s);
      if (!canUnlock(key, s.unlocked, free, isOpen(s.realm, 'keystones'), capstonesOpen(s.realm))) return s;
      // 空囊 Not over a chest fuller than the node would let it be. The sheet says why.
      if (capRefuses(s, key) !== null) return s;
      once(id, () => { float(JUICE.learned, 'jade'); burst('jade', null, 14, 70); });
      return { ...s, unlocked: [...s.unlocked, key] };
    });
    sfx.buy();
    haptics.strike();
  }, []);

  // 岔 A held fork of the Path becomes its twin, once a day (sim/fork.ts).
  const onSwap = useCallback((key: string) => {
    setState((s) => swapFork(s, key, s.at, isOpen(s.realm, 'keystones')));
    sfx.buy();
    haptics.strike();
  }, []);

  const onStance = useCallback((key: string | null) => {
    setState((s) => ({ ...s, stance: key }));
    sfx.tap();
    haptics.tap();
  }, []);

  const onSequence = useCallback((keys: string[]) => {
    setState((s) => ({ ...s, sequence: keys }));
    sfx.tap();
    haptics.tap();
  }, []);

  return {
    onBrew, onWearAll, onFuseAll, onEquip, onUnequip, onRefine, onFuse, climb,
    onSalvage, onSalvageAll, onUnlock, onSwap, onStance, onSequence,
  };
}
