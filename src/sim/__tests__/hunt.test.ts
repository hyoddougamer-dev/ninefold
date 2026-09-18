import { describe, expect, it } from 'vitest';
import { HAUL_DECAY_K, HUNT_COST_SECONDS, PATH_TUNING } from '../balance';
import { haul, hunt, huntCost } from '../hunt';
import { newState } from '../save';
import { advance } from '../time';
import type { Path } from '../types';

const PATHS: readonly Path[] = ['sword', 'blade', 'bow'];
const T0 = 1_700_000_000;

/** Cumulative haul over n hunts of one path. */
function total(path: Path, n: number): number {
  return Array.from({ length: n }, (_, i) => haul(i + 1, path)).reduce((a, b) => a + b, 0);
}

/**
 * The GDD's reading: what n hunts return against *this path's own* four. It answers
 * "is more play rewarded, and by how much" — but it is blind across paths, because
 * every path is 1.00 at four by construction.
 */
function advantage(path: Path, n: number): number {
  return total(path, n) / total(path, 4);
}

/** The cross-path reading: everything against 劍 sword at four, so the paths compare. */
function versusSword(path: Path, n: number): number {
  return total(path, n) / total('sword', 4);
}

/** Share of a day's qi that n hunts cost, at this path's cost scale. */
function dayShare(path: Path, n: number): number {
  return (n * HUNT_COST_SECONDS * PATH_TUNING[path].costScale) / 86_400;
}

describe('狩 hunting, without a ceiling', () => {
  it('prints the advantage table for every path', () => {
    const counts = [4, 8, 20, 50];
    const lines: string[] = [`\n  K = ${HAUL_DECAY_K}, a hunt costs ${HUNT_COST_SECONDS / 60} min of your own rate\n`];
    for (const p of PATHS) {
      lines.push(`  ${p.padEnd(6)} k=${String(PATH_TUNING[p].k).padEnd(4)} ` +
        `burst x${PATH_TUNING[p].burst} on ${PATH_TUNING[p].burstHunts}  cost x${PATH_TUNING[p].costScale}`);
      for (const n of counts) {
        lines.push(`    ${String(n).padStart(3)} hunts   vs own 4: x${advantage(p, n).toFixed(2)}` +
          `   vs sword's 4: x${versusSword(p, n).toFixed(2)}` +
          `   ${(100 * dayShare(p, n)).toFixed(0)}% of the day's qi`);
      }
    }
    console.log(lines.join('\n') + '\n');

    // Five times the play buys well under five times the haul, at every path.
    for (const p of PATHS) expect(advantage(p, 20)).toBeLessThan(4);
  });

  it('never refuses a hunt and never returns nothing', () => {
    for (const p of PATHS) {
      for (const n of [1, 10, 100, 10_000]) {
        expect(haul(n, p)).toBeGreaterThan(0);
        expect(Number.isFinite(haul(n, p))).toBe(true);
      }
    }
  });

  it('keeps the three paths genuinely different, or the third one does not ship', () => {
    // 刀 blade leads early; 劍 sword overtakes when the day runs long. Compared on the
    // one baseline, because self-normalised numbers make every path look identical at four.
    expect(versusSword('blade', 3)).toBeGreaterThan(versusSword('sword', 3));
    expect(versusSword('sword', 20)).toBeGreaterThan(versusSword('blade', 20));

    // And the crossover must actually happen inside a day someone might play.
    const crossover = [...Array(40).keys()].map((i) => i + 1)
      .find((n) => versusSword('sword', n) > versusSword('blade', n));
    expect(crossover).toBeDefined();
    console.log(`\n  劍 overtakes 刀 at hunt ${crossover} of a day\n`);
    // 弓 bow trades qi for reach, so its cost per hunt is strictly the highest.
    expect(PATH_TUNING.bow.costScale).toBeGreaterThan(PATH_TUNING.sword.costScale);
    expect(PATH_TUNING.bow.reach).toBe(1);

    const spread = Math.abs(versusSword('sword', 20) - versusSword('blade', 20));
    console.log(`\n  sword vs blade at 20 hunts: ${spread.toFixed(2)}x apart\n`);
    expect(spread).toBeGreaterThan(0.2); // "sword but 4% more" is worse than two paths
  });

  it('costs half an hour of your own rate, so the trade feels the same at realm 1 and realm 8', () => {
    const early = { ...newState(T0), road: 'motion' as const };
    const late = advance(early, T0 + 30 * 86_400);
    const asHours = (s: typeof early) => huntCost(s) / (60 * 60 * (huntCost(s) / HUNT_COST_SECONDS));
    expect(asHours(early)).toBeCloseTo(asHours(late), 6);
    console.log(`  realm ${early.realm} hunt costs ${huntCost(early).toFixed(0)} qi; ` +
      `realm ${late.realm} hunt costs ${huntCost(late).toFixed(0)} qi — the same half hour\n`);
  });

  it('will not hunt on stillness, on a locked ground, or without the qi', () => {
    const still = advance(newState(T0), T0 + 86_400);
    expect(hunt(still, still.at, 'ash')).toMatchObject({ ok: false, reason: 'not-on-motion' });

    const moving = { ...still, road: 'motion' as const };
    expect(hunt(moving, moving.at, 'scar')).toMatchObject({ ok: false, reason: 'ground-locked' });
    expect(hunt(moving, moving.at, 'nowhere')).toMatchObject({ ok: false, reason: 'no-such-ground' });
    expect(hunt({ ...moving, qi: 0 }, moving.at, 'ash')).toMatchObject({ ok: false, reason: 'insufficient-qi' });
  });

  it('spends the qi, fills the satchel, and rolls the day over on its own', () => {
    let s = { ...advance(newState(T0), T0 + 2 * 86_400), road: 'motion' as const };
    const before = s.qi;
    const r = hunt(s, s.at, 'ash');
    expect(r.ok).toBe(true);
    if (!r.ok) return;
    expect(r.state.qi).toBeLessThan(before);
    expect(r.value.materials).toBeGreaterThan(0);
    expect(r.value.firstKill).toBe(true);
    expect(r.state.huntCount).toBe(1);

    s = r.state;
    const tomorrow = s.at + 86_400;
    const r2 = hunt(advance(s, tomorrow), tomorrow, 'ash');
    expect(r2.ok).toBe(true);
    if (r2.ok) expect(r2.state.huntCount).toBe(1); // the counter reset, nothing was blocked
  });

  it('agrees with the numbers the GDD was written against', () => {
    // h(n) = 1/(1 + (n-1)/5) at K=5, and the bow is the path that keeps it.
    expect(haul(1, 'bow')).toBeCloseTo(1, 10);
    expect(haul(6, 'bow')).toBeCloseTo(0.5, 10);
    expect(advantage('bow', 8)).toBeCloseTo(1.61, 2);
    expect(advantage('bow', 20)).toBeCloseTo(2.67, 2);
  });
});
