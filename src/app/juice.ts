/**
 * 勁 Juice: the small motions that say a tap landed and a thing was gained.
 *
 * Bruno: *"sinto falta de sumo, animações por aí fora."* Every press in the game was a
 * number changing somewhere else on the screen and nothing where the finger was. This
 * is one layer, fixed over the whole page and outside every screen, that anything can
 * throw a ripple, a rising number or a burst of ink into:
 *
 *   - **ripple** at the point of every press on a button, from a single listener, so no
 *     screen has to remember to ask for it;
 *   - **float** a line of text that rises and fades from where the finger last was
 *     (a bought level says what it bought);
 *   - **burst** a spray of ink drops, for the moments that are events rather than taps.
 *
 * 門 It is a portal into document.body on purpose: `.sheet > *` keeps a transform from
 * its entrance animation for the life of the screen, and a transform traps anything
 * fixed inside it (CLAUDE.md, the tooltip trap). Nothing here is ever inside a screen.
 *
 * Nothing here changes a number. The sim never hears of it.
 */

let lastX = -1;
let lastY = -1;
let armed = false;

const calm = () => typeof matchMedia === 'function' && matchMedia('(prefers-reduced-motion: reduce)').matches;

function layer(): HTMLElement {
  let l = document.getElementById('juice');
  if (!l) {
    l = document.createElement('div');
    l.id = 'juice';
    l.setAttribute('aria-hidden', 'true');
    document.body.appendChild(l);
  }
  return l;
}

/** Add a node and take it away once its animation is done, or after a ceiling. */
function spawn(node: HTMLElement, life: number) {
  layer().appendChild(node);
  const gone = () => node.remove();
  node.addEventListener('animationend', gone, { once: true });
  setTimeout(gone, life);
}

/** Where the last press was, or the middle of the screen when there has been none. */
function here(): [number, number] {
  if (lastX < 0) return [innerWidth / 2, innerHeight / 2];
  return [lastX, lastY];
}

/** Where an element is, for a burst that belongs to a thing rather than a finger. */
export function centreOf(el: Element | null): [number, number] | null {
  if (!el) return null;
  const r = el.getBoundingClientRect();
  if (!r.width && !r.height) return null;
  return [r.left + r.width / 2, r.top + r.height / 2];
}

export function ripple(x: number, y: number) {
  if (calm()) return;
  const n = document.createElement('i');
  n.className = 'jr';
  n.style.left = `${x}px`;
  n.style.top = `${y}px`;
  spawn(n, 700);
}

export type Tone = 'gold' | 'jade' | 'cinnabar' | 'violet';

/** A line that rises from the last press (or from `at`) and fades. */
export function float(text: string, tone: Tone = 'gold', at?: [number, number] | null) {
  const [x, y] = at ?? here();
  const n = document.createElement('b');
  n.className = `jf ${tone}`;
  n.textContent = text;
  n.style.left = `${Math.max(60, Math.min(innerWidth - 60, x))}px`;
  n.style.top = `${y - 18}px`;
  if (calm()) n.classList.add('still');
  spawn(n, 1400);
}

/** A spray of ink drops, each on its own heading. */
export function burst(tone: Tone = 'gold', at?: [number, number] | null, count = 12, reach = 70) {
  if (calm()) return;
  const [x, y] = at ?? here();
  for (let i = 0; i < count; i++) {
    const n = document.createElement('i');
    n.className = `jb ${tone}`;
    const a = (360 / count) * i + ((i * 37) % 23) - 11;
    const d = reach * (0.55 + ((i * 53) % 45) / 100);
    n.style.left = `${x}px`;
    n.style.top = `${y}px`;
    n.style.setProperty('--a', `${a}deg`);
    n.style.setProperty('--d', `${d}px`);
    n.style.setProperty('--s', `${0.6 + ((i * 29) % 9) / 10}`);
    spawn(n, 900);
  }
}

/** One wide ring of light, for a breakthrough or a realm. */
export function bloom(tone: Tone = 'gold', at?: [number, number] | null) {
  if (calm()) return;
  const [x, y] = at ?? [innerWidth / 2, innerHeight / 2];
  const n = document.createElement('i');
  n.className = `jbloom ${tone}`;
  n.style.left = `${x}px`;
  n.style.top = `${y}px`;
  spawn(n, 1300);
}

/**
 * Listen for presses, once. Every button gets a ripple at the finger and the last press
 * is remembered, so a gain can rise from the place that earned it.
 */
export function armJuice() {
  if (armed || typeof document === 'undefined') return;
  armed = true;
  document.addEventListener('pointerdown', (e) => {
    lastX = e.clientX;
    lastY = e.clientY;
    const t = e.target as Element | null;
    const b = t && t.closest ? t.closest('button') : null;
    if (b && !(b as HTMLButtonElement).disabled) ripple(e.clientX, e.clientY);
  }, { capture: true, passive: true });
}
