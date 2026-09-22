import { useEffect, useRef, useState } from 'react';
import { GLOSS } from '../glossary.ts';

/**
 * 註 A character you can tap, answered where it stands.
 *
 * Bruno: *"existe demasiado texto que nem eu percebo ou sem tooltips explicado."* Both
 * halves of that are one problem. The screens explained themselves in paragraphs because
 * there was nowhere smaller to put an explanation — the only place a character was ever
 * defined was 釋 the key, a page you had to leave the screen to reach. So every sentence
 * carried its own glossary, and the hunt screen came to **553 words**.
 *
 * A character that answers itself is what lets the paragraphs go. The note is read from
 * ../glossary.ts, which is the same table 釋 draws, so the short answer here and the long
 * page there can never disagree.
 *
 * It is `position: fixed` and measured from the button at the moment it opens, rather
 * than absolutely positioned inside the flow: a popover that lives in the flow gets
 * clipped by the first ancestor that scrolls, and on these screens everything scrolls.
 */
export function Term({ han, children }: { han: string; children?: React.ReactNode }) {
  const term = GLOSS[han];
  const ref = useRef<HTMLButtonElement>(null);
  const [at, setAt] = useState<{ left: number; top: number; below: boolean } | null>(null);

  // 閉 Anything else the player does puts it away: another tap, a scroll, a key.
  useEffect(() => {
    if (!at) return;
    const shut = () => setAt(null);
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
  }, [at]);

  // A character the game cannot explain is drawn plainly rather than made to look
  // tappable and then saying nothing, which is worse than no affordance at all.
  if (!term) return <span className="cjk">{children ?? han}</span>;

  const open = () => {
    const r = ref.current?.getBoundingClientRect();
    if (!r) return;
    const below = r.bottom + 120 < window.innerHeight;
    setAt({
      left: Math.min(Math.max(12, r.left + r.width / 2), window.innerWidth - 12),
      top: below ? r.bottom + 8 : r.top - 8,
      below,
    });
  };

  return (
    <>
      <button ref={ref} className="term cjk" data-open={at ? 'true' : undefined}
        onClick={(e) => { e.stopPropagation(); at ? setAt(null) : open(); }}
        aria-label={`${han} — ${term.name}`}>
        {children ?? han}
      </button>
      {at && (
        <span className="termtip" data-below={at.below}
          style={{ left: at.left, top: at.top }} role="tooltip">
          <b className="cjk">{term.han}</b>
          <em>{term.name}</em>
          {term.note && <i>{term.note}</i>}
        </span>
      )}
    </>
  );
}
