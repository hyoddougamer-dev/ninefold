/**
 * 開山 A game left open across the switch reloads itself into the season, once.
 *
 * load() retires a closed-test save and the season card follows, but load() runs once, when
 * the page opens. A PC that never sleeps, or the Android app coming back from the background
 * on Monday morning, kept playing the closed-test cultivator after the switch: nothing it did
 * was written (save.ts refuses a stale state), every sync was refused for its season, and the
 * season card waited for a reload nobody knew to make. Measured in the audit of 16 October.
 *
 * So the clock asks, on every tick and whenever the page comes back into view, whether the
 * cultivator on the screen is one the device would retire now. If it is, the page reloads, and
 * the ordinary load does the rest: the farewell from the last write before the switch, the
 * card, a fresh season cultivator.
 *
 * 一 Once. A module flag stops a second call in this page, and a mark in sessionStorage stops a
 * second reload in this tab: if the reload brought the same cultivator back (a device that
 * could not remove the old save, say), the game goes on as it was and Ranks says why, rather
 * than reloading for ever. A device that cannot write even the mark never reloads at all.
 */
import { retires } from '../sim/season.ts';

/** sessionStorage, so the mark lives as long as the tab and never reaches another one. */
export const RELOADED = 'ninefold.season.reloaded';

let asked = false;

/**
 * Reload into the season if `s` is a cultivator the device retires at `now`. Returns whether
 * it reloaded. `reload` is the page's own unless a test hands one in.
 */
export function reloadIfRetired(s: unknown, now: number, reload: () => void = () => location.reload()): boolean {
  if (asked || !retires(s, now)) return false;
  asked = true;
  try {
    if (sessionStorage.getItem(RELOADED) !== null) return false;
    sessionStorage.setItem(RELOADED, String(Math.floor(now)));
  } catch {
    return false;
  }
  reload();
  return true;
}

/** Only the tests call this: a page that reloaded is a new page, and a test file is not. */
export function rearmSwitch(): void { asked = false; }
