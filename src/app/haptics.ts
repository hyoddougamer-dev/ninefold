/**
 * 震 Vibration.
 *
 * `navigator.vibrate` exists on Android and is absent on iOS, and some browsers throw
 * rather than return false — so every call is wrapped and failure is silence. It also
 * follows the sound switch: someone who muted the game did not ask to be buzzed either.
 */
import { isMuted } from './sound.ts';

function buzz(pattern: number | readonly number[]): void {
  if (isMuted()) return;
  try {
    navigator.vibrate?.(pattern as number | number[]);
  } catch { /* unsupported, or blocked by the page's engagement rules */ }
}

export const haptics = {
  tap: () => buzz(8),
  strike: () => buzz(12),
  wound: () => buzz([0, 22]),
  win: () => buzz([0, 30, 60, 30]),
  lose: () => buzz(60),
  breakthrough: () => buzz([0, 40, 80, 40, 80, 90]),
};
