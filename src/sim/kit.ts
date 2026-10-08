/**
 * 業 What a cultivator carries into a hard fight: an elixir, a sigil, an array under the
 * cave floor. Read once into a setup like everything else, so the odds on the screen and
 * the fight that follows are the same fight. See sim/crafts.ts for what fills it and for
 * the fights it is allowed into (never a common beast; at the Dragon of the tribulation it
 * counts at a share of itself, DRAGON_KIT_SHARE).
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
  /**
   * 縛 Only this share of the beast's first blow is turned aside: a Binding Sigil carried where
   * it works at part of itself (the Dragon, DRAGON_KIT_SHARE). Absent or 0 leaves `bind` to
   * decide, all or nothing.
   */
  readonly bound?: number;
  /** 照 This share of every blow taken goes back into the beast. */
  readonly reflect: number;
  /** 九轉 Once, a blow that would end the fight mends to full instead. */
  readonly revive: boolean;
  /**
   * 九轉 How much of the way back to full health the blow that would end the fight mends, when
   * it is not all of it: the Nine-Turn Pill at the Dragon mends this share of what it would
   * have mended. Absent is the whole way. It is a share of the mend and never a floor of
   * health, because any health left at all is one more round of striking, which is worth a
   * fixed slice of the fight however little of it there is.
   */
  readonly reviveShare?: number;
  /** 心魔 The heart demon's power is multiplied by this. */
  readonly demon: number;
  /**
   * 跡 The share of its health the other side has already lost when the fight begins: a
   * 擂台 challenger whose trail was taken in the vault (TRAIL_WOUND). Zero everywhere else.
   */
  readonly wound?: number;
  /**
   * 破境 Days of a bottleneck an elixir or a sigil breaks: carried into the warden of the
   * realm the cultivator stands in, the wall stands as if the gate had loosened this many
   * days longer (CRAFT_KIT.breach). Zero everywhere else.
   */
  readonly breach?: number;
  /**
   * 封 Days of the gate's seal a 破境丹 Breakthrough Pill carried into the warden counts as:
   * the whole seal, for a pill made for the realm, which breaks it outright. Zero everywhere
   * else, and for a pill made for a realm below.
   */
  readonly unseal?: number;
  /**
   * 破境丹 The share of its gate's whole bottleneck the Breakthrough Pill took away in this
   * fight (CRAFT_KIT.pill, by rank and realm). Its days are in `breach` as well, so the wall
   * stands as if they had been waited. Zero everywhere else.
   */
  readonly thin?: number;
  /**
   * 譜 What the other side's power is multiplied by, for a fight the cultivator's own codex
   * thins where nothing else names it: 古銅 the vault's gates (sim/hundred.ts). 1 elsewhere.
   */
  readonly foe?: number;
}
export const NO_KIT: Kit = { strike: 1, taken: 1, mend: 0, bind: false, reflect: 0, revive: false, demon: 1, wound: 0, breach: 0, unseal: 0, thin: 0 };
