import type { Beast } from '../data/bestiary.ts';
import {
  AFFIXES, AFFIX_INFO, RARITIES, RARITY_INFO, SECONDARIES, baseValue, droppableIn,
  roundValue, type Affix, type GearTemplate, type Item, type Rarity, type Roll,
} from '../data/gear.ts';

/**
 * 落 What a dead beast leaves behind.
 *
 * Two rolls, in this order: does anything drop, and if so how good is it. Both are
 * seeded from the kill, so the same kill always yields the same item — a save cannot be
 * reloaded to re-roll a bad drop, and nothing has to be stored to prevent that.
 */

export const BASE_DROP_CHANCE = 0.18;

/**
 * Commons drop sometimes; a warden always leaves something, because it only dies once.
 * 運 Fortune adds to the first and can make the second true of everything.
 */
export function dropChance(beast: Beast, bonus = 0, always = false): number {
  if (beast.warden || always) return 1;
  return Math.min(1, BASE_DROP_CHANCE + bonus);
}

/**
 * Rarity weights for a beast. They tilt upward with the realm, and a warden's tilt
 * harder still — which is what makes the nine warden fights worth looking forward to
 * rather than being a toll on the way up.
 */
export function rarityWeights(beast: Beast, luck = 1): Record<Rarity, number> {
  const r = beast.realm;
  const lift = (beast.warden ? 2.6 : 1) * luck;
  return {
    common: Math.max(4, 60 - 5 * r) / lift,
    spirit: 25 + r,
    mystic: (10 + 2 * r) * lift,
    earth: (3 + 1.2 * r) * lift,
    heaven: (0.6 + 0.45 * r) * lift,
  };
}

/** Deterministic noise, seeded from the kill. */
function dice(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function pickRarity(beast: Beast, roll: number, luck: number): Rarity {
  const w = rarityWeights(beast, luck);
  const total = RARITIES.reduce((sum, r) => sum + w[r], 0);
  let at = roll * total;
  for (const r of RARITIES) {
    at -= w[r];
    if (at <= 0) return r;
  }
  return 'common';
}

/** How much an item's rolled percentage may swing either side of its base. */
export const VARIANCE = 0.15;

export interface Fortune {
  /** Points added to a common's drop chance, as a fraction. */
  readonly chance?: number;
  /** How much the rare end of the table is weighted up. */
  readonly luck?: number;
  /** 造化 Creation: every beast drops something. */
  readonly always?: boolean;
}

/**
 * Picks the extra lines a rank carries, weighted, and never the same axis twice — two
 * lines of 力 on one piece read as a bug even when the maths is fine.
 */
export function rollSecondaries(
  template: GearTemplate, rarity: Rarity, d: () => number,
): readonly Roll[] {
  const count = SECONDARIES[rarity];
  const pool: Affix[] = AFFIXES.filter((a) => a !== template.affix);
  const out: Roll[] = [];

  for (let i = 0; i < count && pool.length > 0; i++) {
    const total = pool.reduce((sum, a) => sum + AFFIX_INFO[a].weight, 0);
    let at = d() * total;
    let picked = pool[pool.length - 1];
    for (const a of pool) {
      at -= AFFIX_INFO[a].weight;
      if (at <= 0) { picked = a; break; }
    }
    pool.splice(pool.indexOf(picked), 1);
    // A secondary is worth 60% of what the same rank's primary would be.
    const swing = 1 - VARIANCE + d() * VARIANCE * 2;
    out.push({ affix: picked, value: roundValue(picked, baseValue(template, rarity, picked) * 0.6 * swing) });
  }
  return out;
}

export function rollDrop(
  beast: Beast, realm: number, seed: number, fortune: Fortune = {},
): Item | null {
  const d = dice(seed);
  if (d() > dropChance(beast, fortune.chance ?? 0, fortune.always ?? false)) return null;

  // Only gear the cultivator could plausibly find: the beast's realm, capped by theirs.
  const pool = droppableIn(Math.min(beast.realm, realm));
  if (pool.length === 0) return null;
  const template: GearTemplate = pool[Math.floor(d() * pool.length) % pool.length];

  const rarity = pickRarity(beast, d(), fortune.luck ?? 1);
  const swing = 1 - VARIANCE + d() * VARIANCE * 2;
  const primary: Roll = {
    affix: template.affix,
    value: roundValue(template.affix, baseValue(template, rarity, template.affix) * swing),
  };

  return {
    id: `${seed.toString(36)}-${template.key}`,
    template: template.key,
    rarity,
    rolls: [primary, ...rollSecondaries(template, rarity, d)],
  };
}

/** The odds of each rank from one beast, for the screen to show honestly. */
export function rarityOdds(beast: Beast, luck = 1): Record<Rarity, number> {
  const w = rarityWeights(beast, luck);
  const total = RARITIES.reduce((sum, r) => sum + w[r], 0);
  return Object.fromEntries(
    RARITIES.map((r) => [r, w[r] / total]),
  ) as Record<Rarity, number>;
}

export { RARITY_INFO };
