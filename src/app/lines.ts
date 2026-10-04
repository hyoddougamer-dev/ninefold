import type { Affix } from '../data/gear.ts';
import { BEASTS } from '../data/bestiary.ts';
import { FIND_TOP, FUSE_TOP, QI_ROOF_FIRST, QI_ROOF_TOP, gearQiRate } from '../sim/balance.ts';
import { dropChance } from '../sim/drops.ts';
import { bendArt, bendFind, bendFuse, bendLuck, bendSunder } from '../sim/schools.ts';
import { GEAR } from './copy.ts';

/**
 * 註 A gear line's note: what it does, its cap, and how it bends, worked out by the sim's
 * own bends at +100% and +300% rather than said in the abstract. The formula rides in
 * `math`, which the note sets apart at its foot. See GEAR.line.
 */
const times = (x: number) => `×${x.toFixed(2)}`;
const share = (x: number) => `${Math.round(x * 1000) / 10}%`;
const points = (x: number) => String(Math.round(x * 1000) / 10);
/** A beast that is not a warden, whose chance of a drop is the plain one. */
const COMMON = BEASTS.find((b) => !b.warden)!;
export function lineNote(a: Affix): string {
  switch (a) {
    case 'power': return GEAR.line.power();
    // 氣 At the first layer of the fifth realm, rung 36, with no tree: where the bend is worked.
    case 'rate': return GEAR.line.rate(times(QI_ROOF_FIRST), times(QI_ROOF_TOP), times(gearQiRate(1, 1, 36)), times(gearQiRate(3, 1, 36)));
    case 'luck': return GEAR.line.luck(times(bendLuck(100)), times(bendLuck(300)));
    case 'find': return GEAR.line.find(Math.round(FIND_TOP * 100), share(dropChance(COMMON)),
      points(bendFind(100)), share(dropChance(COMMON, bendFind(100))));
    case 'sunder': return GEAR.line.sunder(share(1 - bendSunder(100)), share(1 - bendSunder(300)));
    case 'art': return GEAR.line.art(times(bendArt(100)), times(bendArt(300)));
    case 'refine': return GEAR.line.refine(FUSE_TOP, times(bendFuse(100)), times(bendFuse(300)));
    case 'capacity': return GEAR.line.capacity();
  }
}
/** The formula, with what s stands for, for the foot of the note. */
export const lineMath = (a: Affix): string => `${GEAR.mathHead}\n${GEAR.math[a]}`;
