import type { State } from '../sim/state.ts';
import { opensIn, type System } from '../sim/unlocks.ts';
import type { Place } from './ready.ts';

/**
 * 新 Which tab each system lives on, so a breakthrough can say where to find what it opened.
 *
 * The audit found the breakthrough naming six systems at the second realm in a list that
 * named no tab and could not be tapped, under three cards that covered it. A system you
 * are told about and cannot find is a system you were not told about.
 */
export const TAB_OF: Readonly<Record<System, Place>> = {
  hunt: 'hunt', gear: 'gear', refine: 'gear', fuse: 'gear', cave: 'cultivate', crafts: 'crafts',
  arts: 'dao', cores: 'cultivate', secret: 'hunt', deep: 'hunt', tree: 'dao', keystones: 'dao',
  seclusion: 'cultivate', alchemy: 'crafts', tower: 'trials', record: 'hunt', sigils: 'crafts',
  bestiary: 'hunt', arrays: 'crafts', furnace: 'trials', tribulation: 'cultivate',
};

/**
 * 新 The mark kept in `seen` while a realm's new tabs wait to be opened: one entry, the
 * tabs it names joined by dots, e.g. `new:hunt.gear`. One entry and never more, because
 * `seen` is capped at 32; the longest it can be (all five tabs) is 31 characters.
 *
 * It is written at the breakthrough and only then, so a save from before this existed
 * carries no mark and never sees a dot for a tab it has known for weeks.
 */
const PREFIX = 'new:';

/** The tabs a realm opened something on, other than 修 where the breakthrough happens. */
export function newTabsOf(realm: number): readonly Place[] {
  return [...new Set(opensIn(realm).map((x) => TAB_OF[x.key]))].filter((t) => t !== 'cultivate');
}

/** The tabs still wearing the 新 dot. */
export function freshTabs(s: Pick<State, 'seen'>): readonly Place[] {
  const mark = s.seen.find((k) => k.startsWith(PREFIX));
  return mark ? (mark.slice(PREFIX.length).split('.').filter(Boolean) as Place[]) : [];
}

function withTabs(s: State, tabs: readonly Place[]): State {
  const rest = s.seen.filter((k) => !k.startsWith(PREFIX));
  return { ...s, seen: tabs.length ? [...rest, `${PREFIX}${tabs.join('.')}`] : rest };
}

/** At a breakthrough: these tabs are new. Whatever the last realm left unopened is forgotten. */
export function markFresh(s: State, tabs: readonly Place[]): State {
  const now = freshTabs(s);
  if (now.length === tabs.length && now.every((t, i) => t === tabs[i])) return s;
  return withTabs(s, tabs);
}

/** The player opened a tab: its dot goes. Hands back the same state when nothing changes. */
export function clearFresh(s: State, tab: Place): State {
  const now = freshTabs(s);
  return now.includes(tab) ? withTabs(s, now.filter((t) => t !== tab)) : s;
}
