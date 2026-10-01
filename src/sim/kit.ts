/**
 * 業 What a cultivator carries into a hard fight: an elixir, a sigil, an array under the
 * cave floor. Read once into a setup like everything else, so the odds on the screen and
 * the fight that follows are the same fight. See sim/crafts.ts for what fills it and for
 * the fights it is allowed into (never the Dragon, never a tower floor).
 */
export interface Kit {
  /** Every blow struck is multiplied by this. */
  readonly strike: number;
  /** Every blow taken is multiplied by this. */
  readonly taken: number;
  /** Health mended every round, as a share of the whole. */
  readonly mend: number;
  /** 縛 The beast's first blow never lands. */
  readonly bind: boolean;
  /** 照 This share of every blow taken goes back into the beast. */
  readonly reflect: number;
  /** 九轉 Once, a blow that would end the fight mends to full instead. */
  readonly revive: boolean;
  /** 心魔 The heart demon's power is multiplied by this. */
  readonly demon: number;
}
export const NO_KIT: Kit = { strike: 1, taken: 1, mend: 0, bind: false, reflect: 0, revive: false, demon: 1 };
