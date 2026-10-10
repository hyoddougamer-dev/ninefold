import { useRef } from 'react';

/**
 * 一 A sound, a burst or a buzz decided inside a state updater, played once per tap.
 *
 * An updater has to be pure, and these were not: React runs one twice under StrictMode
 * and may run it again when a tick lands between the tap and the render, so a refine
 * could ring twice. The effect still has to be decided in there, because only there is
 * the state the tap really applied to. So each tap takes a number first (`tap`) before it
 * calls setState, and whatever the updater asks to play is played once for that number.
 */
export function useOnce() {
  const taps = useRef(0);
  const played = useRef(new Set<number>());
  const once = (id: number, effect: () => void) => {
    if (played.current.has(id)) return;
    played.current.add(id);
    if (played.current.size > 64) played.current.delete(played.current.values().next().value!);
    effect();
  };
  const tap = () => ++taps.current;
  return { tap, once };
}
