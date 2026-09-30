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
  return [s.realm, s.layer, s.levels, s.stance, s.sequence, s.worn, s.awakened, s.unlocked,
    s.brewed, s.tribulation, s.killed, s.chose, s.demons, s.crafts.carry, s.crafts.pouch, s.crafts.arrays];
}
