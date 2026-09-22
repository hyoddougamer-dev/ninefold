import { ESCAPE } from '../copy.ts';

/**
 * 出口 The way out, in one place, always in the same place.
 *
 * Bruno: *"os botões de return home ou back estão sempre no fundo das páginas e requerem
 * scrolls massivos."* Measured, on a 400×860 phone, and he was being kind about it:
 *
 *     引 How to play      989px tall   the way out at 92% down
 *     存 The save panel   860px        at 91%
 *     境 The realm card  1028px        at 93%
 *     釋 The key        4419px        at 98%   (five screens of scrolling)
 *
 * Five panels, five different shells, and every one of them buried its exit at the
 * bottom of its own content. A panel you have to read to the end of to leave is a panel
 * that traps you. And 釋 the key, the screen whose whole job is "look something up",
 * was the worst of them by a factor of four.
 *
 * So there is one escape, drawn by the app rather than by each panel, **fixed to the
 * viewport** so it cannot scroll away. One gesture to learn, one thing to build, one
 * thing to test, and the same corner every time. The panels keep their own bottom
 * buttons: those read as *finished*, which is a different thing from *get me out*.
 */
export function Escape({ onClose }: { onClose: () => void }) {
  return (
    <button className="escape" onClick={onClose} aria-label={ESCAPE.label}>
      <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
        <path d="M6 6 L18 18 M18 6 L6 18" fill="none" stroke="currentColor"
              strokeWidth="2.2" strokeLinecap="round" />
      </svg>
    </button>
  );
}
