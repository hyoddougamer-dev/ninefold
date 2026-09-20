import { describe, expect, it } from 'vitest';
import { LINES, PILL_GRADES, PILL_LINES, pillOf } from '../../data/alchemy.ts';
import { LAYERS_PER_REALM, levelCap } from '../balance.ts';
import { WARDEN_EDGE, odds, referencePower } from '../combat.ts';
import { wardenOf } from '../../data/bestiary.ts';
import {
  FLOORS_PER_REALM, floorBeast, floorLoot, floorPower, lootBonus, seals,
} from '../tower.ts';
import {
  PILL_BANE_FLOOR, PILL_POWER, pillBane, pillCost, pillFortune, pillPower, pillsTaken,
} from '../furnace.ts';
import { brew, canBrew, clearFloor, furnaceMenu, standingFloor, towerOpen } from '../trials.ts';
import { isOpen, opensAt } from '../unlocks.ts';
import { newState, power, validate, type State } from '../state.ts';
import { num } from '../format.ts';

const T0 = 1_700_000_000;

/** A cultivator at the ceiling of a realm with the levels that realm allows. */
function atCap(realm: number): State {
  return {
    ...newState(T0),
    realm,
    layer: LAYERS_PER_REALM - 1,
    levels: { technique: levelCap(realm), method: 0, pills: 0, cores: 0 },
  };
}

describe('塔 the Endless Tower', () => {
  it('lines its floors up with the climb, and then keeps going', () => {
    const rows = [1, 3, 5, 7, 9].map((r) => {
      const floor = r * FLOORS_PER_REALM;
      return `  floor ${String(floor).padStart(2)}  ${num(floorPower(floor)).padStart(8)}` +
        `   realm ${r}'s warden ${num(referencePower(r) * WARDEN_EDGE).padStart(8)}` +
        `   pays ${num(floorLoot(floor)).padStart(7)} 材`;
    });
    console.log(`\n  無盡塔 — nine floors to a realm, and no top:\n${rows.join('\n')}`);
    console.log(`  floor 100 ${num(floorPower(100))} · floor 200 ${num(floorPower(200))}` +
      ` · floor 400 ${num(floorPower(400))}\n`);

    // The ninth floor of a realm is that realm's warden, near enough, all the way up.
    for (const r of [1, 3, 5, 7, 9]) {
      const ratio = floorPower(r * FLOORS_PER_REALM) / (referencePower(r) * WARDEN_EDGE);
      expect(ratio).toBeGreaterThan(0.75);
      expect(ratio).toBeLessThan(1.35);
    }
    // And above the mountain it simply carries on.
    expect(floorPower(200)).toBeGreaterThan(floorPower(81));
    expect(floorPower(2000)).toBeGreaterThan(floorPower(200));
    expect(Number.isFinite(floorPower(2000))).toBe(true);
  });

  it('is shut until its realm, and open for good after it', () => {
    const before = { ...atCap(opensAt('tower') - 1), tower: 0 };
    expect(towerOpen(before)).toBe(false);
    expect(clearFloor(before, 1)).toBe(before);

    const after = { ...atCap(opensAt('tower')), tower: 0 };
    expect(towerOpen(after)).toBe(true);
    expect(clearFloor(after, 1).tower).toBe(1);
  });

  it('offers exactly one floor, and only ever the next one', () => {
    const s = { ...atCap(opensAt('tower')), tower: 12 };
    expect(standingFloor(s)).toBe(13);
    // A floor already taken pays nothing a second time, and floors cannot be skipped.
    expect(clearFloor(s, 12)).toBe(s);
    expect(clearFloor(s, 20)).toBe(s);
    const won = clearFloor(s, 13);
    expect(won.tower).toBe(13);
    expect(won.materials).toBeGreaterThan(s.materials);
    expect(clearFloor(won, 13)).toBe(won);
  });

  it('pays in materials and in seals, and never in qi per second', () => {
    expect(seals(8)).toBe(0);
    expect(seals(9)).toBe(1);
    expect(seals(95)).toBe(10);
    expect(lootBonus(0)).toBe(1);
    expect(lootBonus(90)).toBeGreaterThan(lootBonus(9));
    // The rule the whole economy rests on: nothing uncapped may touch the qi rate.
    const s = atCap(5);
    const climbed = { ...s, tower: 300 };
    expect(climbed.levels).toEqual(s.levels);
    expect(power(climbed)).toBe(power(s));
  });

  it('is a fight the build decides, not one power alone decides', () => {
    const plain = atCap(5);
    const built = { ...plain, stance: 'endure', sequence: ['crane', 'tiger'], killed: { crane: 1, tiger: 1 } };
    let a = 0;
    let b = 0;
    for (let f = 1; f <= 60; f++) {
      if (odds(plain, floorBeast(f), floorPower(f)) > 0.6) a = f;
      if (odds(built, floorBeast(f), floorPower(f)) > 0.6) b = f;
    }
    console.log(`  a realm-5 cultivator at the cap reaches floor ${a}; ` +
      `with 續 and two arts, floor ${b}\n`);
    expect(b).toBeGreaterThan(a);
  });

  it('draws a real beast for every floor, for ever', () => {
    for (const f of [1, 9, 40, 81, 82, 200, 1000]) {
      expect(floorBeast(f).key).toBeTruthy();
      expect(floorBeast(f)).toBe(floorBeast(f));
    }
  });
});

describe('爐 the Furnace', () => {
  it('names the pill after the cultivator, not after the recipe', () => {
    expect(pillOf('body', 1).name).toBe('Qi-Knitting Pill');
    expect(pillOf('body', 9).name).toBe('Tribulation Pill');
    for (const line of LINES) {
      expect(PILL_GRADES[line]).toHaveLength(9);
      expect(new Set(PILL_GRADES[line].map((p) => p.han)).size).toBe(9);
      expect(PILL_LINES[line].effect).toBeTruthy();
    }
    const names = LINES.flatMap((l) => PILL_GRADES[l].map((p) => p.name));
    expect(new Set(names).size).toBe(names.length);
    // The screen reads the line's `effect` string, so it has to still be true after
    // anybody edits the constant beside it.
    expect(PILL_LINES.body.effect).toContain(`${Math.round(PILL_POWER * 100)}%`);
  });

  it('prices a pill off the mountain, and past the top goes on climbing', () => {
    const none = { body: 0, bane: 0, fortune: 0 };
    const rows = [0, 20, 40, 60, 80, 120, 200].map((n) => {
      const cost = pillCost({ ...none, body: n }, 'body');
      return `  pill ${String(n + 1).padStart(4)}   ${num(cost.qi).padStart(8)} qi   ` +
        `${num(cost.materials).padStart(8)} 材`;
    });
    console.log(`\n  丹爐 — the nth pill costs half of what the nth layer of the climb costs:\n${rows.join('\n')}\n`);
    for (let n = 1; n < 300; n++) {
      expect(pillCost({ ...none, body: n }, 'body').qi)
        .toBeGreaterThan(pillCost({ ...none, body: n - 1 }, 'body').qi);
    }
    expect(Number.isFinite(pillCost({ ...none, body: 2999 }, 'body').qi)).toBe(true);
  });

  it('is shut until its realm, however much qi and material is in hand', () => {
    const loaded = { ...atCap(opensAt('furnace') - 1), qi: 1e15, materials: 1e12 };
    expect(isOpen(loaded.realm, 'furnace')).toBe(false);
    expect(canBrew(loaded, 'body')).toBe(false);
    expect(brew(loaded, 'body')).toBe(loaded);
    expect(canBrew({ ...loaded, realm: opensAt('furnace') }, 'body')).toBe(true);
  });

  it('takes qi and materials both, so waiting alone can never buy power', () => {
    const rich = { ...atCap(opensAt('furnace')), qi: 1e15, materials: 0 };
    expect(canBrew(rich, 'body')).toBe(false);
    expect(brew(rich, 'body')).toBe(rich);

    const fed = { ...rich, materials: 1e9 };
    expect(canBrew(fed, 'body')).toBe(true);
    const after = brew(fed, 'body');
    expect(after.brewed.body).toBe(1);
    expect(after.qi).toBeLessThan(fed.qi);
    expect(after.materials).toBeLessThan(fed.materials);
    expect(power(after)).toBeGreaterThan(power(fed));
  });

  it('thins beasts without ever erasing them', () => {
    expect(pillBane({ body: 0, bane: 0, fortune: 0 })).toBe(1);
    expect(pillBane({ body: 0, bane: 40, fortune: 0 })).toBeLessThan(1);
    // However many are taken, a beast never falls below its floor — a beast that can be
    // reduced to nothing is a beast that stops being a fight, and the tower has no top.
    expect(pillBane({ body: 0, bane: 100_000, fortune: 0 }))
      .toBeGreaterThanOrEqual(PILL_BANE_FLOOR);
    expect(pillPower({ body: 30, bane: 0, fortune: 0 })).toBeGreaterThan(1);
    expect(pillFortune({ body: 0, bane: 0, fortune: 10 })).toBeGreaterThan(1);
  });

  it('has no hold on the tribulation, because lightning has no blood in it', async () => {
    const { effectiveBeastPower } = await import('../combat.ts');
    const top: State = { ...atCap(9), tribulationAt: 1e9 };
    const dosed = { ...top, brewed: { body: 0, bane: 500, fortune: 0 } };
    expect(effectiveBeastPower(dosed, wardenOf(9)))
      .toBe(effectiveBeastPower(top, wardenOf(9)));
    // Against anything with blood in it, the same pills bite.
    expect(effectiveBeastPower(dosed, wardenOf(5)))
      .toBeLessThan(effectiveBeastPower(top, wardenOf(5)));
  });

  it('shows the furnace as a menu the screen can draw without thinking', () => {
    const s = { ...atCap(7), qi: 1e12, materials: 1e9 };
    const menu = furnaceMenu(s);
    expect(menu).toHaveLength(3);
    for (const row of menu) {
      expect(row.pill.name).toBe(PILL_GRADES[row.line][6].name);
      expect(row.cost.qi).toBeGreaterThan(0);
      expect(typeof row.affordable).toBe('boolean');
    }
  });

  it('will not let a save claim a tower it never climbed or pills it never brewed', () => {
    const forged = {
      ...newState(T0), v: 1, realm: 5,
      tower: 1e9, brewed: { body: 1e9, bane: -4, fortune: 'lots' },
    };
    const held = validate(forged, T0 + 10);
    expect(held.tower).toBeLessThanOrEqual(3000);
    expect(held.brewed.body).toBeLessThanOrEqual(3000);
    expect(held.brewed.bane).toBe(0);
    expect(held.brewed.fortune).toBe(0);
    expect(pillsTaken(held.brewed)).toBeGreaterThan(0);
  });
});
