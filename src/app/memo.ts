import type { State } from '../sim/state.ts';

/**
 * 算 What a fight reads off a save, as a dependency list for useMemo.
 *
 * The clock ticks five times a second and moves the qi every time, which changes no fight
 * at all. Keyed on the whole state, the odds on a screen were fought forty-one times over
 * on every tick; keyed on this, they are fought again only when something that could
 * change a fight has changed. One list, so no screen can forget a field another remembers:
 * 狩 the hunt used to leave out the kill counts, and the record's power moves with them.
 */
export function fightDeps(s: State): readonly unknown[] {
  // 緣 A boon from the road (read off the answers) can change a fight, and it was missing:
  // taking one left the odds on the screen where they were until something else moved.
  // 心魔 The demons put down are counted too.
  // 攜 And what is carried: the kit changes the odds of a warden, a demon and a vault gate.
  // 深 And how deep the Guardian Array is cut, which changes how much a warden takes.
  // 煉 And the places' refining, which a refine changes without touching what is worn.
  return [s.realm, s.layer, s.levels, s.stance, s.sequence, s.worn, s.refined, s.awakened, s.unlocked,
    s.brewed, s.tribulation, s.killed, s.chose, s.demons, s.crafts.carry, s.crafts.pouch, s.crafts.arrays, s.crafts.cut];
}

/**
 * 架 A useMemo that outlives the screen it is read on: one value, made again only when
 * one of its inputs is no longer the very same thing. A tab away and back unmounts a
 * screen and throws its memos away, and on a chest of 1,800 (rekaris, on the Discord,
 * 2026-10-06) reading it again cost a second on a phone every time 器 was opened.
 * Holds the last value only, so it keeps no more than the screen itself did.
 */
export function shelf<T>(): (deps: readonly unknown[], make: () => T) => T {
  let last: { deps: readonly unknown[]; value: T } | null = null;
  return (deps, make) => {
    if (last && last.deps.length === deps.length && last.deps.every((d, i) => Object.is(d, deps[i]))) return last.value;
    const value = make();
    last = { deps, value };
    return value;
  };
}
