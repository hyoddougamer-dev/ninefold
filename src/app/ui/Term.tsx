import { useEffect, useLayoutEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { GLOSS } from '../glossary.ts';

/**
 * 註 A character you can tap, answered where it stands.
 *
 * Bruno: *"existe demasiado texto que nem eu percebo ou sem tooltips explicado."* Both
 * halves of that are one problem. The screens explained themselves in paragraphs because
 * there was nowhere smaller to put an explanation: the only place a character was ever
 * defined was 釋 the key, a page you had to leave the screen to reach. So every sentence
 * carried its own glossary, and the hunt screen came to **553 words**.
 *
 * A character that answers itself is what lets the paragraphs go. The note is read from
 * ../glossary.ts, which is the same table 釋 draws, so the short answer here and the long
 * page there can never disagree.
 *
 * 出 It renders into document.body through a portal, and that is not a preference.
 *
 * Bruno, with a screenshot: *"quando carrego em algumas tooltip ficam escondidas e
 * misturadas com outro texto"*. The note was drawn underneath the card below it, with
 * only its left and right edges showing past the card's own background. It was
 * `position: fixed` with `z-index: 45`, which should have put it over everything, and
 * the reason it did not is one line of CSS nowhere near this file:
 *
 *     .sheet > * { animation: sheetin .13s ease-out both; }
 *     @keyframes sheetin { from { opacity: 0; transform: translateY(5px); } }
 *
 * `both` keeps an animation in effect forever after it ends, so the list holding the
 * beasts keeps a computed transform of matrix(1,0,0,1,0,0) for the life of the screen.
 * An identity matrix is still a transform, and a transform does two things a popover
 * cannot survive: it makes that element the containing block for `position: fixed`
 * descendants, so the note is placed against the scrolled list rather than the screen,
 * and it opens a stacking context, so `z-index: 45` only ever ranks the note against
 * its own siblings inside that one card. Every card after it in the list paints on top.
 *
 * A portal takes the note out of that subtree entirely. It is then a child of body,
 * where fixed means the screen and 45 means 45, and no ancestor of the character can
 * ever reach it again. It also survives the next transform or `overflow: hidden` that
 * gets added to a screen, which is the part worth having.
 *
 * 量 And it is measured before it is shown. The old version placed the note by its
 * centre and let CSS pull it left by half its width, which put a 280px note 105px off
 * the left edge of the screen whenever the character sat in the left margin: 境 and 層
 * on 修, 拆 on 器. Nothing clamps a translate. So the note is rendered once, invisibly,
 * its real box is read, and only then is it placed, with its **edges** held inside the
 * screen and a flip above the character if there is no room below. That runs in a
 * layout effect, before the browser paints, so there is no flash of it in the wrong
 * place.
 */
export function Term({ han, children }: { han: string; children?: React.ReactNode }) {
  const term = GLOSS[han];
  const ref = useRef<HTMLButtonElement>(null);
  const tip = useRef<HTMLSpanElement>(null);
  /** Where the character is. Set on the tap, and never recomputed. */
  const [from, setFrom] = useState<DOMRect | null>(null);
  /** Where the note goes, once its real size is known. Null means not yet measured. */
  const [at, setAt] = useState<{ left: number; top: number; below: boolean } | null>(null);

  // 閉 Anything else the player does puts it away: another tap, a scroll, a key.
  useEffect(() => {
    if (!from) return;
    const shut = () => { setFrom(null); setAt(null); };
    const onKey = (e: KeyboardEvent) => { if (e.key === 'Escape') shut(); };
    window.addEventListener('scroll', shut, true);
    window.addEventListener('resize', shut);
    window.addEventListener('keydown', onKey);
    const id = window.setTimeout(() => document.addEventListener('pointerdown', shut), 0);
    return () => {
      window.clearTimeout(id);
      document.removeEventListener('pointerdown', shut);
      window.removeEventListener('scroll', shut, true);
      window.removeEventListener('resize', shut);
      window.removeEventListener('keydown', onKey);
    };
  }, [from]);

  // 置 One pass to measure, one to place. The margin is the smallest gap that still
  // reads as a gap on a phone, and the same number is used on all four sides.
  useLayoutEffect(() => {
    if (!from || !tip.current) return;
    const M = 10;
    const box = tip.current.getBoundingClientRect();
    const below = from.bottom + 8 + box.height + M <= window.innerHeight;
    setAt({
      left: Math.max(M, Math.min(from.left + from.width / 2 - box.width / 2,
                                 window.innerWidth - box.width - M)),
      top: below ? from.bottom + 8 : Math.max(M, from.top - 8 - box.height),
      below,
    });
  }, [from]);

  // A character the game cannot explain is drawn plainly rather than made to look
  // tappable and then saying nothing, which is worse than no affordance at all.
  if (!term) return <span className="cjk">{children ?? han}</span>;

  const open = () => {
    const r = ref.current?.getBoundingClientRect();
    if (r) setFrom(r);
  };

  return (
    <>
      <button ref={ref} className="term cjk" data-open={from ? 'true' : undefined}
        onClick={(e) => { e.stopPropagation(); from ? (setFrom(null), setAt(null)) : open(); }}
        aria-label={`${han}: ${term.name}`}>
        {children ?? han}
      </button>
      {from && createPortal(
        <span ref={tip} className="termtip" data-below={at ? at.below : true}
          style={at ? { left: at.left, top: at.top } : { left: 0, top: 0, visibility: 'hidden' }}
          role="tooltip">
          <b className="cjk">{term.han}</b>
          <em>{term.name}</em>
          {term.note && <i>{term.note}</i>}
        </span>, document.body)}
    </>
  );
}
