/**
 * 丹符 How long a pill and a sigil take to make, gathering included (2026-10-05).
 *
 * rekaris asked for each pill and sigil to be *"at least an hour a piece"*. A make is its
 * own seconds at the furnace or the desk and every herb, ore, part and metal it asks for,
 * each at the seconds its own recipe takes, followed down to the gathering. Read twice:
 * with no tool, and with the tool a cultivator can have forged by the recipe's realm in
 * every craft the make passes through (TOOL_METALS: one step for each metal reached).
 * Arrays, familiarity and mastery are left out, so these are the long end.
 *
 * Read by src/sim/__tests__/crafts.test.ts and by CRAFT_KIT_WORK's comment in balance.ts.
 */
import { CRAFT_TOOL_STEP } from '../src/sim/balance.ts';
import { RECIPES, TOOL_METALS, type Recipe } from '../src/data/crafts.ts';

const MAKER: Readonly<Record<string, Recipe>> = Object.fromEntries(
  RECIPES.filter((r) => r.makes.kind === 'item').map((r) => [(r.makes as { item: string }).item, r]));

/** Seconds of workshop time one make takes, with the tool step every craft holds. */
export function workOf(r: Recipe, step = 0): number {
  const tool = 1 - CRAFT_TOOL_STEP * step;
  let t = r.seconds * tool;
  for (const [k, n] of r.needs) {
    if (k === 'mat') continue;
    const m = MAKER[k];
    if (m) t += n * workOf(m, step);
  }
  return t;
}

/** 具 The tool step a cultivator can have forged by this realm. */
export const stepAt = (realm: number) => TOOL_METALS.filter((m) => m <= realm).length;

export interface KitWork {
  readonly key: string;
  readonly name: string;
  readonly realm: number;
  /** Minutes with no tool. */
  readonly bare: number;
  /** Minutes with the tools of its realm. */
  readonly tooled: number;
}

/** Every pill and sigil, and how long one takes. */
export function kitWork(): KitWork[] {
  return RECIPES.filter((r) => r.skill === 'alchemy' || r.skill === 'sigil').map((r) => ({
    key: r.key, name: r.name, realm: r.realm,
    bare: workOf(r) / 60, tooled: workOf(r, stepAt(r.realm)) / 60,
  }));
}

if (process.argv[1]?.endsWith('kitwork.ts')) {
  for (const w of kitWork()) {
    console.log(`${w.key.padEnd(22)} r${w.realm}  ${w.bare.toFixed(0).padStart(4)} min bare  ${w.tooled.toFixed(0).padStart(4)} min with its realm's tools`);
  }
}
