import { describe, expect, it } from 'vitest';
import { BEASTS } from '../../data/bestiary.ts';
import { MARKS, knownIn, realmsKnown } from '../record.ts';
import { POINTS_PER_BESTIARY, daoEarned } from '../dao.ts';
import { filledRealms, newState, type State } from '../state.ts';
import { opensAt } from '../unlocks.ts';
import { playAll } from '../../../tools/habits.ts';

/**
 * 圖鑑 Finishing a realm, and why the bar is where it is.
 *
 * The first version paid for a realm whose four beasts were all 通 Mastered: a hundred
 * kills of each. Measured across the five habits and ten thousand fights, **not one
 * realm was ever finished by anybody**, and not one at ten kills each either.
 *
 * The reason is worth keeping written down, because it is a fact about the game and not
 * about the harness: a player hunts the strongest beast they can beat, since that is the
 * one that pays. A realm's weakest animal is killed once for its 見 mark and then never
 * again, and nothing in the game has ever given a reason to go back for it.
 *
 * So this is that reason, priced at forty fights against animals you outclass. The
 * curves are still measured without it, so the point it pays can only be a bonus on a
 * run that already balanced.
 */

const T0 = 1_700_000_000;
const realmsIn = [...new Set(BEASTS.map((b) => b.realm))];

describe('圖鑑 finishing a realm of the bestiary', () => {
  it('asks for every beast of a realm, not only the ones worth killing', () => {
    const killed: Record<string, number> = {};
    const first = BEASTS.filter((b) => b.realm === 1);
    // The strongest three, hunted hard. This is what playing normally produces.
    for (const b of first.slice(1)) killed[b.key] = 500;
    expect(knownIn(killed, 1).done).toBe(first.length - 1);
    expect(realmsKnown(killed)).toBe(0);
    // And the weakest one, ten times, is what finishes it.
    killed[first[0].key] = MARKS[1];
    expect(realmsKnown(killed)).toBe(1);
  });

  it('pays a 道 point for each realm finished, and nothing before the sixth', () => {
    const killed = Object.fromEntries(BEASTS.map((b) => [b.key, MARKS[1]]));
    const below: State = { ...newState(T0), realm: opensAt('bestiary') - 1, killed };
    const above: State = { ...newState(T0), realm: opensAt('bestiary'), killed };
    expect(filledRealms(below)).toBe(0);
    expect(filledRealms(above)).toBe(realmsIn.length);
    // A late system arrives full: the kills were counted all along.
    expect(daoEarned(0, 0, filledRealms(above)))
      .toBe(POINTS_PER_BESTIARY * realmsIn.length);
  });

  /**
   * The measurement that set the bar, kept so it cannot quietly stop being true. Every
   * cultivator in the harness plays without knowing 圖鑑 exists, and none of them
   * stumbles into it, which is the point. It has to be gone after on purpose.
   */
  it('is never finished by accident, however much somebody hunts', () => {
    const rows = playAll().map((run) => {
      const k = run.state.killed;
      const kills = Object.values(k).reduce((a, b) => a + b, 0);
      const near = Math.max(...realmsIn.map((r) => knownIn(k, r).done));
      return { name: run.habit.name, kills, filled: realmsKnown(k), near };
    });
    console.log('\n  圖鑑 nobody finishes a realm without meaning to:');
    for (const r of rows) {
      console.log(`    ${r.name.padEnd(13)} ${String(r.kills).padStart(6)} kills · ` +
        `${r.filled} realms filled · best realm ${r.near}/4 熟`);
    }
    console.log('');
    for (const r of rows) expect(r.filled).toBe(0);
  }, 120_000);
});
