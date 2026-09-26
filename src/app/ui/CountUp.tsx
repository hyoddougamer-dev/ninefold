import { useEffect, useState } from 'react';
import { num } from '../../sim/format.ts';

/**
 * 數 A number that arrives instead of appearing: it counts up from nothing to what it is,
 * fast at first and settling, in a second and a bit. Used where a number is the reward
 * itself (歸 what the hours away gathered), and nowhere it has to be read at a glance.
 * With reduced motion asked for, it is simply the number.
 */
export function CountUp({ to, ms = 1300, delay = 0 }: { to: number; ms?: number; delay?: number }) {
  const calm = typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;
  const [shown, setShown] = useState(calm ? to : 0);
  useEffect(() => {
    if (calm) { setShown(to); return; }
    let raf = 0;
    let start = 0;
    const tick = (t: number) => {
      if (!start) start = t + delay;
      const k = Math.max(0, Math.min(1, (t - start) / ms));
      const eased = 1 - (1 - k) ** 3;
      setShown(to * eased);
      if (k < 1) raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [to, ms, delay, calm]);
  // A count of things counts in whole things: "0.3 layers" was on the screen mid-count.
  return <>{num(Number.isInteger(to) ? Math.round(shown) : shown)}</>;
}
