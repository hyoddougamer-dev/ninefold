import { useEffect, useRef, useState, type Dispatch, type SetStateAction } from 'react';
import type { State } from '../sim/state.ts';
import { focusBonus } from '../sim/dao.ts';
import { begin, hide, isOver, show, type Sitting } from './sitting.ts';
import { now, payTo } from './clock.ts';

/**
 * 入定 The sitting, as the screen sees it: whether the game is on screen, how deep the
 * sitting is, and how long it has left. The clock (App.tsx) reads it every tick; this hook
 * owns the visit that starts and ends with the screen, and nothing about it is remembered
 * between visits.
 */
export function useSitting(
  ready: boolean,
  unlocked: readonly string[],
  setState: Dispatch<SetStateAction<State>>,
) {
  /**
   * 入定 This visit's sitting, or null before one has begun (see sitting.ts).
   *
   * It is deliberately *not* in the save. Being away must never cost anything. That is
   * the promise, so this can only ever add, and a save that came back claiming a deep
   * meditation would be claiming hours nobody sat through.
   */
  const sitting = useRef<Sitting | null>(null);
  const [focus, setFocus] = useState(1);
  const [satOut, setSatOut] = useState(false);
  /** 入定 Whole seconds left in this visit's sitting, 0 when there is none. */
  const [sitLeft, setSitLeft] = useState(0);

  // 入定 The visit. It starts when the game comes on screen and ends when it goes off it,
  // and nothing about it is remembered between visits.
  //
  // 視 On screen, not in focus. rekaris, on the Discord: *"I would expect to be able to use
  // my computer while playing the game"*. A click in another window used to end the visit
  // (a `blur`) with the game still in plain sight beside it, and coming back started the
  // sitting again from nothing. The sitting still ends after half an hour, so a
  // game left on a second screen is paid the same as one looked at.
  //
  // 隱 Off screen, the sitting goes on. rekaris, on the Discord: *"When changing tabs or
  // application, the game goes offline."* Hiding the game used to end the sitting at once.
  // Now a sitting already running keeps going behind a hidden tab, held at the depth it had,
  // until its own end, and the hidden stretch is paid when the game comes back (sitting.ts).
  // Coming back after it has ended begins a new one, which is what coming back always did.
  useEffect(() => {
    if (!ready) return;
    // The hidden stretch is paid with the sitting as it was while hidden, before it moves on.
    const settle = (sit: Sitting | null) => {
      const t = now();
      setState((s) => payTo(s, t, sit, focusBonus(tree.current)));
    };
    const leave = () => {
      const sit = sitting.current;
      if (!sit || sit.hiddenAt !== null) return;
      settle(sit);
      sitting.current = hide(sit, now());
    };
    const enter = () => {
      const sit = sitting.current;
      if (document.hidden) return;
      if (sit && sit.hiddenAt === null) return;
      if (sit) settle(sit);
      const t = now();
      sitting.current = !sit || isOver(sit, t) ? begin(t) : show(sit, t);
    };
    const onVisibility = () => (document.hidden ? leave() : enter());
    sitting.current = null;
    enter();
    document.addEventListener('visibilitychange', onVisibility);
    window.addEventListener('pagehide', leave);
    window.addEventListener('pageshow', enter);
    return () => {
      document.removeEventListener('visibilitychange', onVisibility);
      window.removeEventListener('pagehide', leave);
      window.removeEventListener('pageshow', enter);
    };
  }, [ready]);

  // 道 The tree as the clock sees it, kept fresh for an interval that is only set up once.
  const tree = useRef<readonly string[]>(unlocked);
  useEffect(() => { tree.current = unlocked; }, [unlocked]);

  return { sitting, tree, focus, setFocus, satOut, setSatOut, sitLeft, setSitLeft };
}
