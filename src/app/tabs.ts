import type { System } from '../sim/unlocks.ts';

/**
 * 開 The tabs, and what opens them.
 *
 * A locked tab is shown rather than hidden, dimmed and with the realm that opens it,
 * because the whole point of a purely vertical game is that climbing hands you something
 *, and you cannot look forward to a tab you have never seen.
 */
export const TABS = [
  { key: 'cultivate', han: '修', label: 'Cultivate', needs: null },
  { key: 'hunt', han: '狩', label: 'Hunt', needs: 'hunt' },
  { key: 'trials', han: '塔', label: 'Trials', needs: 'platform' },
  { key: 'gear', han: '器', label: 'Gear', needs: 'gear' },
  { key: 'crafts', han: '業', label: 'Crafts', needs: 'crafts' },
  { key: 'dao', han: '道', label: 'Path', needs: 'arts' },
] as const satisfies readonly { key: string; han: string; label: string; needs: System | null }[];

export type TabKey = (typeof TABS)[number]['key'];
