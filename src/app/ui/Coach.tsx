import { useEffect, useState } from 'react';

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
        const off = next.top < 8 || next.bottom > window.innerHeight - 8;
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

  // The arrow goes wherever there is room. Above the target by preference, because a
  // thumb on a phone is usually below what it is about to press and would cover it.
  const above = box.top > 86;

  // 側 On the PC the tabs are a rail down the left, one row under another, and an arrow
  // above a row lands on the name of the row above it: pointing at 狩 Hunt, it sat on
  // the word CULTIVATE. A short target at the left edge of a wide screen is pointed at
  // from its right instead, where the rail has nothing in it.
  const side = window.innerWidth >= 1100 && box.height < 70 && box.right < window.innerWidth * 0.3;
  const y = side ? box.top + box.height / 2 : above ? box.top - 10 : box.bottom + 10;

  // 避 And across, away from the words.
  //
  // Centred over a full-width button, the arrow lands in the middle of whatever line of
  // text sits above it, the screen's heading or the sentence explaining the fight,
  // and covers a word. Text on this screen is set from the left and rarely fills the
  // line, so the right-hand end of a wide target is reliably empty. Narrow targets keep
  // the centre, where there is nothing to miss.
  const wide = box.width > window.innerWidth * 0.55;
  const x = side ? box.right + 12 : wide ? box.right - 26 : box.left + box.width / 2;

  return (
    <div className="coach" aria-hidden="true">
      <span className="ring" style={{
        left: box.left - 5, top: box.top - 5,
        width: box.width + 10, height: box.height + 10,
      }} />
      <span className="point" data-above={above} data-side={side}
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

function sameRect(a: DOMRect | null, b: DOMRect | null): boolean {
  if (a === b) return true;
  if (!a || !b) return false;
  // Half a pixel: below that it is sub-pixel layout noise, not movement worth a render.
  return Math.abs(a.left - b.left) < 0.5 && Math.abs(a.top - b.top) < 0.5
    && Math.abs(a.width - b.width) < 0.5 && Math.abs(a.height - b.height) < 0.5;
}
