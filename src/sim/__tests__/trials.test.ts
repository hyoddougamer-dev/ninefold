import { describe, expect, it } from 'vitest';
import { LINES, PILL_GRADES, PILL_LINES, pillOf } from '../../data/alchemy.ts';
import { LAYERS_PER_REALM, PAIR_TOWER_QI, PILL_AHEAD, PILL_PACE, TOWER_QI_BELOW, TOWER_QI_HOURS, levelCap } from '../balance.ts';
import { ARCHETYPES, TEMPLATE_BY_KEY, callingOf, type Item, type Slot, type Worn } from '../../data/gear.ts';
import { SCHOOL_INFO, type School } from '../../data/schools.ts';
import { WARDEN_EDGE, odds, referencePower } from '../combat.ts';
import { wardenOf } from '../../data/bestiary.ts';
import {
  FLOORS_PER_REALM, floorBeast, floorHours, floorLoot, floorPower, fullFloor, lootBonus, seals,
} from '../tower.ts';
import {
  PILL_BANE_FLOOR, PILL_POWER, pillBane, pillCost, pillFortune, pillPower, pillsTaken,
} from '../furnace.ts';
import { brew, canBrew, clearFloor, floorMaterial, floorQi, furnaceMenu, standingFloor, towerOpen, towerRate } from '../trials.ts';
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
    console.log(`\n  無盡塔: nine floors to a realm, and no top:\n${rows.join('\n')}`);
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

  /**
   * 材 The tower card and the arena both quoted the table times the seals, and the save
   * was credited the record and the cards on top. A cultivator with mastered beasts and a
   * heaven's 塔 card was told a floor paid a fraction of what it did.
   */
  it('quotes exactly what the save is credited, record and cards counted', () => {
    const s: State = {
      ...atCap(9), tower: 47,
      killed: { rat: 100, hound: 100, frog: 100, serpent: 12 },
      awakened: ['feast', 'wolf', 'slaughter', 'platform', 'hoard', 'dew', 'taotie', 'onethought', 'longstair'],
    };
    const won = clearFloor(s, 48);
    expect(won.tower).toBe(48);
    expect(won.materials - s.materials).toBe(floorMaterial(s, 48));
    // And it is more than the table and the seals alone, or this test proves nothing.
    expect(floorMaterial(s, 48)).toBeGreaterThan(floorLoot(48) * 1.15 ** 5);
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
      const cost = pillCost({ ...none, body: n }, 'body', n);
      return `  pill ${String(n + 1).padStart(4)}   ${num(cost.qi).padStart(8)} qi   ` +
        `${num(cost.materials).padStart(8)} 材`;
    });
    console.log(`\n  丹爐: the nth pill costs half of what the nth layer of the climb costs:\n${rows.join('\n')}\n`);
    // On the marks' pace every pill costs more than the last.
    for (let n = 1; n < 300; n++) {
      expect(pillCost({ ...none, body: n }, 'body', n).qi)
        .toBeGreaterThan(pillCost({ ...none, body: n - 1 }, 'body', n).qi);
    }
    expect(Number.isFinite(pillCost({ ...none, body: 2999 }, 'body', 3000).qi)).toBe(true);
  });

  /**
   * 穩 And past PILL_AHEAD pills ahead of that pace, the price holds, in qi and in 材
   * alike, so a cultivator who fell behind the Dragon pays days in a straight line to
   * catch up rather than a wall. It never makes a pill cheaper than the one before it.
   */
  it('holds the price once a cultivator is far enough behind the marks', () => {
    const none = { body: 0, bane: 0, fortune: 0 };
    const marks = 10;
    const edge = PILL_PACE * marks + PILL_AHEAD;
    const at = (n: number) => pillCost({ ...none, body: n }, 'body', marks);
    expect(at(edge).qi).toBeGreaterThan(at(edge - 1).qi);
    expect(at(edge + 1)).toEqual(at(edge));
    expect(at(edge + 50)).toEqual(at(edge));
    // One more mark and the pace moves on, and so does the price.
    expect(pillCost({ ...none, body: edge + 1 }, 'body', marks + 1).qi).toBeGreaterThan(at(edge).qi);
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
    // However many are taken, a beast never falls below its floor: a beast that can be
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
      ...newState(T0), v: 1, realm: 9,
      tower: 1e9, brewed: { body: 1e9, bane: -4, fortune: 'lots' },
    };
    const held = validate(forged, T0 + 10);
    expect(held.tower).toBeLessThanOrEqual(3000);
    expect(held.brewed.body).toBeLessThanOrEqual(3000);
    expect(held.brewed.bane).toBe(0);
    expect(held.brewed.fortune).toBe(0);
    expect(pillsTaken(held.brewed)).toBeGreaterThan(0);
    // 爐 And before the furnace exists there are no pills at all, whatever the save says.
    expect(pillsTaken(validate({ ...forged, realm: 5 }, T0 + 10).brewed)).toBe(0);
  });
});

/**
 * 吸 衣 What a floor pays in qi, and the one thing it must never read: the clothes.
 *
 * A tester took gear off and watched the pay of an outgrown floor climb (2026-10-04),
 * because the pay was scaled by the cultivator's own power and paid at the rate with gear
 * on. Now the floor and the realm decide the hours, the rate is the bare one, and 天師
 * the Celestial Master is the only thing a body adds.
 */
describe('吸 what a floor pays in qi', () => {
  /** One piece of a school in a place, the first shape that has both. */
  const pieceOf = (school: School, slot: Slot, value = 40): Item => {
    const a = ARCHETYPES.find((x) => x.slot === slot && SCHOOL_INFO[school].axes.includes(x.affix))!;
    const tpl = TEMPLATE_BY_KEY[`${a.key}6`];
    return { id: `${school}-${slot}`, template: tpl.key, rarity: 'earth', rolls: [{ affix: tpl.affix, value }] };
  };
  const can = (sc: School, slot: Slot) => ARCHETYPES.some((x) => x.slot === slot && SCHOOL_INFO[sc].axes.includes(x.affix));
  const SIX: Slot[] = ['weapon', 'robe', 'crown', 'boots', 'talisman', 'ring'];
  /** Three of one school and three of another, so the pair wakes. */
  const pairWorn = (a: School, b: School): Worn => {
    const out: Worn = {};
    let na = 0, nb = 0;
    for (const slot of SIX) {
      if (na < 3 && can(a, slot)) { out[slot] = pieceOf(a, slot); na++; } else if (nb < 3 && can(b, slot)) { out[slot] = pieceOf(b, slot); nb++; }
    }
    return out;
  };
  const fifth: State = { ...atCap(5), layer: 4, tower: 30 };

  it('pays the same whatever is worn, so stripping buys nothing', () => {
    const sword = { ...fifth, worn: Object.fromEntries(SIX.filter((s) => can('sword', s)).map((s) => [s, pieceOf('sword', s, 300)])) } as State;
    const qi = { ...fifth, worn: Object.fromEntries(SIX.filter((s) => can('qi', s)).map((s) => [s, pieceOf('qi', s, 300)])) } as State;
    expect(power(sword)).toBeGreaterThan(power(fifth) * 2);
    for (const floor of [1, 20, 31, 41, 44, 45, 60]) {
      expect(floorQi(sword, floor), `floor ${floor}`).toBeCloseTo(floorQi(fifth, floor), 6);
      expect(floorQi(qi, floor), `floor ${floor}`).toBeCloseTo(floorQi(fifth, floor), 6);
    }
    console.log(`\n  fifth realm, nothing worn, six 劍 pieces or six 氣 pieces: floor 31 pays ` +
      `${floorHours(31, 5).toFixed(2)}h, floor 41 ${floorHours(41, 5).toFixed(2)}h, floor 45 ` +
      `${floorHours(45, 5).toFixed(2)}h, the same qi for all three bodies\n`);
  });

  it('starts the whole six hours at your realm warden floor and pays a fifth less below it', () => {
    expect(fullFloor(5)).toBe(45);
    expect(fullFloor(9)).toBe(81);
    expect(floorHours(45, 5)).toBe(TOWER_QI_HOURS);
    expect(floorHours(500, 5)).toBe(TOWER_QI_HOURS);
    expect(floorHours(44, 5)).toBeCloseTo(TOWER_QI_HOURS * TOWER_QI_BELOW, 9);
    expect(floorHours(36, 5)).toBeCloseTo(TOWER_QI_HOURS * TOWER_QI_BELOW ** 9, 9);
    // A floor never pays more for the cultivator having climbed further up the mountain.
    for (let f = 1; f < 100; f++) expect(floorHours(f, 6)).toBeLessThanOrEqual(floorHours(f, 5));
    // And the qi is the hours at the rate with nothing worn.
    expect(floorQi(fifth, 50)).toBeCloseTo(towerRate(fifth) * 3600 * TOWER_QI_HOURS, 4);
  });

  it('pays 天師 the Celestial Master a quarter again, and nothing else a body wears moves it', () => {
    const celestial = { ...fifth, worn: pairWorn('qi', 'arts') };
    const wargod = { ...fifth, worn: pairWorn('sword', 'body') };
    expect(callingOf(celestial.worn).pair?.key).toBe('celestial');
    expect(floorQi(celestial, 45)).toBeCloseTo(floorQi(fifth, 45) * PAIR_TOWER_QI, 4);
    expect(floorQi(wargod, 45)).toBeCloseTo(floorQi(fifth, 45), 6);
  });
});
