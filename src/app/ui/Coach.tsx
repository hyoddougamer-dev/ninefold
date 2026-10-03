import { useEffect, useRef, useState } from 'react';

/**
 * 指 The pointing finger.
 *
 * Bruno, third time of asking: *"O tutorial devia ser mais interativo, setas etc."* He
 * is describing the difference between a card that *says* "buy one of the boxes below"
 * and a ring drawn around the box, with an arrow at it, that moves when the box moves.
 * The first is reading. The second is being shown.
 *
 * So any element in the game can mark itself as a thing the guide might point at,
 *
 *     <button data-coach="upg-technique" …>
 *
 * and this draws a ring around whichever one the current step names. Three rules make it
 * safe to put over a live game:
 *
 *   1. **It never takes a tap.** The whole overlay is `pointer-events: none`, so the
 *      ring is over the button and the button is still the thing you press. A tutorial
 *      that intercepts the press it is asking for would be a cruel joke.
 *   2. **It never points at nothing.** The target is looked up every frame; if it is not
 *      on this tab, not rendered, or scrolled out of the document, there is simply no
 *      ring. Nothing to clean up and nothing stale.
 *   3. **It follows.** Rects are re-measured on an animation frame, so the ring stays on
 *      the button through scrolling, layout shifts and the bar growing underneath it.
 *      State is only set when the rect actually changed, or this would re-render the
 *      whole game sixty times a second.
 *
 * It also scrolls the target into view once, the first time a step names it. Once, and
 * keyed on the target: a guide that yanked the screen back every frame would be worse
 * than one that never moved it.
 */
export function Coach({ at }: { at: string | null }) {
  const [box, setBox] = useState<DOMRect | null>(null);
  const target = useRef<HTMLElement | null>(null);

  useEffect(() => {
    if (!at) { setBox(null); return; }
    let raf = 0;
    let bring = 0;
    let brought = false;
    // 二 A target may name alternatives, a|b: the first one actually on the screen wins,
    // so the ring can lead from a tab's half to the thing inside it.
    const find = () => {
      for (const one of at.split('|')) {
        const el = document.querySelector<HTMLElement>(`[data-coach="${CSS.escape(one)}"]`);
        const r = el?.getBoundingClientRect();
        if (el && r && r.width > 0 && r.height > 0) return el;
      }
      return null;
    };

    const tick = () => {
      const el = find();
      target.current = el;
      const r = el?.getBoundingClientRect() ?? null;
      // A rendered-but-collapsed element measures 0x0. That is "not there" for our
      // purposes, and drawing a ring on it would put a dot in the top-left corner.
      const next = r && r.width > 0 && r.height > 0 ? r : null;
      setBox((prev) => (sameRect(prev, next) ? prev : next));

      // 待 Not straight away. The step's card is at the top of the screen and the
      // button it is talking about is usually below the fold, so scrolling on the first
      // frame would whip the explanation off the screen before it had been read. A beat
      // first, then the page glides down to the ring: read, then follow.
      if (next && !brought) {
        brought = true;
        const bottom = el?.closest('nav.tabs') ? window.innerHeight : floorY();
        const off = next.top < 8 || next.bottom > bottom - 8;
        if (off) bring = window.setTimeout(() => el?.scrollIntoView({ block: 'center', behavior: 'smooth' }), 1100);
      }
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    // 取消 Both of them. The delayed scroll outlives the target that asked for it
    // otherwise: the app boots on a blank cultivator, the first step finds a box to
    // point at, the saved game lands a moment later with nothing to point at, and a
    // second after that the page scrolled itself to a ring that is no longer there.
    return () => { cancelAnimationFrame(raf); clearTimeout(bring); };
  }, [at]);

  if (!box) return null;

  // 底 The phone's tab bar is in the window but not in the page. A target scrolled under
  // it was still "on the screen" to the old test, so the arrow stood on RANKS pointing
  // down at a tab nobody meant. Under the bar, there is no ring, and the arrow waits just
  // above the bar, pointing down at where the box is.
  // A tab of the bar itself is pointed at where it stands, bar and all.
  const inBar = !!target.current?.closest('nav.tabs');
  const floor = inBar ? window.innerHeight : floorY();
  const under = box.top > floor - 16;
  const above = under || box.top > 86;

  // 側 On the PC the tabs are a rail down the left, one row under another, and an arrow
  // above a row lands on the name of the row above it: pointing at 狩 Hunt, it sat on
  // the word CULTIVATE. A short target at the left edge of a wide screen is pointed at
  // from its right instead, where the rail has nothing in it.
  const pc = window.innerWidth >= 1100;
  const rail = pc && box.height < 70 && box.right < window.innerWidth * 0.3;
  // 塢 And a target in the dock down the right is pointed at from its left, out of the
  // stage. Above it, the arrow stood on the sentence explaining the fight: the dock is
  // too narrow for the right-hand end of a button to be clear of the line over it.
  const dock = pc && box.left > window.innerWidth * 0.6;
  const side = rail ? 'right' : dock ? 'left' : 'none';

  // 避 And across, away from the words: the right-hand end of a wide target, where text
  // set from the left rarely reaches. But never onto another control. At 320 the right
  // end of 劍訣 sat on the ×1/MAX switch, so each place is tried in turn and the first
  // one with nothing pressable under the disc wins.
  const wide = box.width > window.innerWidth * 0.55;
  const yOf = (up: boolean) => (under ? floor - 6 : up ? box.top - 10 : box.bottom + 10);
  const spots: { x: number; up: boolean }[] = side !== 'none'
    ? [{ x: rail ? box.right + 12 : box.left - 12, up: above }]
    : [
      { x: wide ? box.right - 26 : box.left + box.width / 2, up: above },
      { x: box.left + box.width / 2, up: above },
      { x: box.left + 34, up: above },
      ...(under ? [] : [{ x: wide ? box.right - 26 : box.left + box.width / 2, up: !above }]),
    ];
  const pick = spots.find((p) => !onControl(p.x, p.up ? yOf(p.up) - 34 : yOf(p.up), target.current, floor)) ?? spots[0];
  const x = pick.x;
  const y = side !== 'none' ? box.top + box.height / 2 : yOf(pick.up);

  return (
    <div className="coach" aria-hidden="true" style={{ bottom: window.innerHeight - floor }}>
      {!under && <span className="ring" style={{
        left: box.left - 5, top: box.top - 5,
        width: box.width + 10, height: box.height + 10,
      }} />}
      <span className="point" data-above={pick.up} data-side={side}
        style={{ left: x, top: y }}>
        <svg viewBox="0 0 24 24" width="26" height="26" aria-hidden="true">
          <path d="M12 3 L12 19 M5.5 12.5 L12 19.5 L18.5 12.5"
            fill="none" stroke="currentColor" strokeWidth="2.4"
            strokeLinecap="round" strokeLinejoin="round" />
        </svg>
      </span>
    </div>
  );
}

/** 底 Where the page ends: the top of the phone's tab bar, or the bottom of the window. */
function floorY(): number {
  const r = document.querySelector('nav.tabs')?.getBoundingClientRect();
  return r && r.top > window.innerHeight / 2 ? r.top : window.innerHeight;
}

/** Would a 34px disc with its top edge at `top` sit on something pressable that is not the target? */
function onControl(cx: number, top: number, target: HTMLElement | null, floor: number): boolean {
  if (top < 0 || top + 34 > floor || cx - 17 < 0 || cx + 17 > window.innerWidth) return true;
  for (const [px, py] of [[cx - 13, top + 5], [cx + 13, top + 5], [cx - 13, top + 29], [cx + 13, top + 29], [cx, top + 17]]) {
    for (const el of document.elementsFromPoint(px, py)) {
      if (target && (target === el || target.contains(el) || el.contains(target))) continue;
      if (el.closest('button, a, input, select, textarea, [role="button"], [role="tab"], nav')) return true;
    }
  }
  return false;
}

function sameRect(a: DOMRect | null, b: DOMRect | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  // Half a pixel: below that it is sub-pixel layout noise, not movement worth a render.
  return Math.abs(a.left - b.left) < 0.5 && Math.abs(a.top - b.top) < 0.5
    && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5;
}
