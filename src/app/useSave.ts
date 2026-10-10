import { useEffect, useRef } from 'react';
import type { State } from '../sim/state.ts';
import { keepSpare, save } from '../sim/save.ts';

/**
 * 存 The save, as the screen writes it. The latest state is kept in a ref, so the timer that
 * saves (App.tsx) can read it without depending on it, and a new life is written at once,
 * with its spare copy.
 */
export function useSave(born: boolean, state: State) {
  const latest = useRef(state);
  latest.current = state;
  // 轉世 A new life is written at once, and the spare copy with it: the spare is the life
  // left behind until then, and a main copy lost before the next clean load would bring it back.
  useEffect(() => {
    if (!born) return;
    save(latest.current);
    keepSpare(latest.current);
  }, [born]);

  return latest;
}
