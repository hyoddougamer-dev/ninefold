import { describe, expect, it } from 'vitest';
import { HABITS } from '../../../tools/habits.ts';
import { TOWER_FORGED, maker, towerKit } from '../../../tools/towerkit.ts';
import { towerVerdict } from '../verify.ts';

/**
 * 攜 塔 A pill and a sigil up the tower (rekaris, 2026-10-05): *"If there is an instant-win
 * pill or combination, it would need rebalancing."* Read with tools/towerkit.ts on the
 * active cultivator, every ten days from the tower's realm: the floor it climbs with
 * nothing carried, and with the best pairing the realm allows at Heaven rank.
 */
describe('攜 塔 the kit up the tower', () => {
  const active = HABITS.find((h) => h.name === 'active')!;
  const rows = towerKit(active, 10);

  it('reads enough of the climb to measure something, the ninth realm included', () => {
    for (const r of rows) {
      console.log(`    day ${r.day.toFixed(0)} realm ${r.realm}: floor ${r.bare} bare, ${r.heaven} with ${r.heavenWith} at Heaven rank; the server reads x${r.serverRatio.toFixed(2)} of its reach at most`);
    }
    expect(rows.length).toBeGreaterThanOrEqual(4);
    expect(rows.some((r) => r.realm === 9)).toBe(true);
  });

  it('is worth floors, and no pairing is a win far past the build', () => {
    // A tower floor asks about a fifth more than the one below, so a pill worth a few floors
    // is a pill worth a fifth or two of power. Nothing carried is a ladder of its own.
    expect(rows.some((r) => r.heaven > r.bare)).toBe(true);
    for (const r of rows) expect(r.heaven - r.bare, `day ${r.day}`).toBeLessThanOrEqual(6);
  });

  it('never strikes a floor an honest kit made beatable, and the forgery line stays far past it', () => {
    for (const r of rows) {
      expect(r.serverRatio, `day ${r.day}`).toBeLessThan(TOWER_FORGED / 2);
      // The pairing read above, made by a hand that could make it: Alchemy and Sigil
      // Writing at 99. bestKit reads the levels, so a body with no workshop could not have.
      const crafter = maker(r.state);
      const climbed = { ...crafter, tower: r.heaven };
      expect(towerVerdict(climbed, r.heaven), `day ${r.day} floor ${r.heaven}`).toBe('ok');
      // The furthest any kit could make beatable at all waits or passes, and is never a strike.
      expect(towerVerdict({ ...crafter, tower: r.serverFloor }, r.serverFloor)).not.toBe('strike');
    }
  });
});
