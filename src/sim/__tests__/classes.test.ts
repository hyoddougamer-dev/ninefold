import { describe, expect, it } from 'vitest';
import { ARCHETYPES, TEMPLATE_BY_KEY, callingOf, schoolOf, type Item, type Slot, type Worn } from '../../data/gear.ts';
import { PAIRS, SCHOOLS, SCHOOL_INFO, pairOf, type School } from '../../data/schools.ts';
import { BEASTS } from '../../data/bestiary.ts';
import { MAX_MARK_DAYS, SCHOOL_FULL, SCHOOL_WAKES } from '../balance.ts';
import {
  classBond, classDrive, classMaterial, classMelt, classPills, classPower, classRefine,
  classTower, classUpgrades, classWarden, gearFind, gearFuse, gearLuck, gearSunder,
} from '../schools.ts';
import { effectiveBeastPower } from '../combat.ts';
import { costsClass, ifWorn, swing, verdictOf, wornSwing } from '../inspect.ts';
import { newState, type State } from '../state.ts';
import { BUILDS, playClass, playPlain } from '../../../tools/classes.ts';

const T0 = 1_700_000_000;
/** One piece of a school in a place, the first shape that has both. */
const pieceOf = (school: School, slot: Slot, n = 0): Item => {
  const a = ARCHETYPES.find((x) => x.slot === slot && SCHOOL_INFO[school].axes.includes(x.affix))!;
  const tpl = TEMPLATE_BY_KEY[`${a.key}6`];
  return { id: `${school}-${slot}-${n}`, template: tpl.key, rarity: 'earth', rolls: [{ affix: tpl.affix, value: 40 }] };
};
const body = (plan: [Slot, School][]): Worn => Object.fromEntries(plan.map(([slot, sc], i) => [slot, pieceOf(sc, slot, i)]));
const at = (worn: Worn): State => ({ ...newState(T0), realm: 6, layer: 5, worn });

describe('職 which class a body is', () => {
  it('lets every school fill five places, so every full is reachable', () => {
    for (const sc of SCHOOLS) {
      const slots = new Set(ARCHETYPES.filter((a) => SCHOOL_INFO[sc].axes.includes(a.affix)).map((a) => a.slot));
      expect(slots.size, sc).toBeGreaterThanOrEqual(SCHOOL_FULL);
    }
  });

  it('names one class for every two schools', () => {
    expect(PAIRS).toHaveLength(10);
    for (const a of SCHOOLS) for (const b of SCHOOLS) if (a !== b) expect(pairOf(a, b), `${a}+${b}`).toBeTruthy();
  });

  it('wakes at three, fills at five, pairs at three and three', () => {
    expect(callingOf(body([['weapon', 'sword'], ['robe', 'sword']])).kind).toBe('none');
    const three = callingOf(body([['weapon', 'sword'], ['robe', 'sword'], ['crown', 'sword'], ['ring', 'qi']]));
    expect([three.kind, three.school, three.tier]).toEqual(['pure', 'sword', 1]);
    const five = callingOf(body([['weapon', 'sword'], ['robe', 'sword'], ['crown', 'sword'], ['boots', 'sword'], ['ring', 'sword']]));
    expect([five.kind, five.tier]).toEqual(['pure', 2]);
    const pair = callingOf(body([['weapon', 'sword'], ['robe', 'sword'], ['boots', 'sword'], ['crown', 'body'], ['talisman', 'body'], ['ring', 'body']]));
    expect([pair.kind, pair.pair?.key]).toEqual(['pair', 'wargod']);
    expect(SCHOOL_WAKES).toBe(3);
  });

  it('reads a piece by the line its shape leads with', () => {
    const helm = { id: 'h', template: 'horned6', rarity: 'earth', rolls: [] } as Item;
    expect(schoolOf(helm)).toBe('body');
  });
});

describe('職 what each class does', () => {
  const none = at({});
  const pure = (sc: School) => at(body((['weapon', 'robe', 'crown', 'boots', 'talisman', 'ring'] as Slot[])
    .map((slot) => [slot, sc] as [Slot, School])
    .filter(([slot]) => ARCHETYPES.some((a) => a.slot === slot && SCHOOL_INFO[sc].axes.includes(a.affix)))));
  const pairBody = (a: School, b: School) => {
    const slots: Slot[] = ['weapon', 'robe', 'crown', 'boots', 'talisman', 'ring'];
    const can = (sc: School, slot: Slot) => ARCHETYPES.some((x) => x.slot === slot && SCHOOL_INFO[sc].axes.includes(x.affix));
    const plan: [Slot, School][] = [];
    let na = 0, nb = 0;
    for (const slot of slots) {
      if (na < 3 && can(a, slot)) { plan.push([slot, a]); na++; } else if (nb < 3 && can(b, slot)) { plan.push([slot, b]); nb++; }
    }
    return at(body(plan));
  };

  it('pays each school on its own lever', () => {
    expect(classPower(pure('sword'))).toBeGreaterThan(classPower(none));
    expect(classUpgrades(pure('qi'))).toBeLessThan(1);
    expect(classBond(pure('fortune'))).toBeLessThan(classBond(none));
    expect(classRefine(pure('artificer'))).toBeLessThan(1);
    expect(gearSunder(pure('body'))).toBeLessThan(gearSunder(at(body([['weapon', 'body']]))));
  });

  it('pays every pair on a lever no school touches', () => {
    const checks: [string, (s: State) => number, 'down' | 'up'][] = [
      ['swordimmortal', classTower, 'down'], ['wanderer', classDrive, 'down'], ['wargod', classWarden, 'down'],
      ['swordsmith', classMaterial, 'up'], ['treasuresmith', classMelt, 'up'], ['alchemist', classPills, 'down'],
    ];
    for (const [key, f, dir] of checks) {
      const p = PAIRS.find((x) => x.key === key)!;
      const s = pairBody(p.a, p.b);
      expect(callingOf(s.worn).pair?.key, key).toBe(key);
      if (dir === 'down') expect(f(s), key).toBeLessThan(1); else expect(f(s), key).toBeGreaterThan(1);
    }
  });

  it('reads the four lines that did nothing, and bends them', () => {
    const lined = (affix: 'luck' | 'find' | 'sunder' | 'refine', value: number): State => at({
      ring: { id: 'r', template: 'plainring6', rarity: 'earth', rolls: [{ affix, value }] },
    });
    expect(gearLuck(lined('luck', 100))).toBeGreaterThan(1);
    expect(gearFind(lined('find', 50))).toBeGreaterThan(0);
    expect(gearSunder(lined('sunder', 30))).toBeLessThan(1);
    expect(gearFuse(lined('refine', 30))).toBeGreaterThan(1);
    // Bent: a hundred times the line is nowhere near a hundred times the effect.
    expect(gearLuck(lined('luck', 10000))).toBeLessThan(4);
    expect(gearFind(lined('find', 10000))).toBeLessThan(0.26);
  });

  it('never lets 破 touch the Dragon', () => {
    const s = { ...at({ ring: { id: 'r', template: 'plainring6', rarity: 'earth', rolls: [{ affix: 'sunder', value: 500 }] } }), realm: 9 } as State;
    const dragon = BEASTS.find((b) => b.key === 'dragon')!;
    expect(effectiveBeastPower(s, dragon)).toBe(effectiveBeastPower({ ...s, worn: {} }, dragon));
  });
});

describe('職 the sheet never calls a piece that costs the class an upgrade', () => {
  const immortal = at(body([['weapon', 'sword'], ['crown', 'sword'], ['boots', 'sword'], ['robe', 'qi'], ['talisman', 'qi'], ['ring', 'qi']]));
  it('knows when a piece ends the class', () => {
    const helm = { ...pieceOf('body', 'crown', 9), rolls: [{ affix: 'sunder' as const, value: 400 }] };
    expect(costsClass(immortal, helm)).toBe(true);
    // Another Sword piece in a Sword place keeps the pair as it is.
    expect(costsClass(immortal, pieceOf('sword', 'boots', 9))).toBe(false);
  });
  it('and a piece that brings a school to its full is a gain', () => {
    const four = at(body([['weapon', 'sword'], ['crown', 'sword'], ['boots', 'sword'], ['robe', 'sword'], ['ring', 'qi']]));
    expect(costsClass(four, pieceOf('sword', 'talisman', 9))).toBe(false);
    const full = at(body([['weapon', 'sword'], ['crown', 'sword'], ['boots', 'sword'], ['robe', 'sword'], ['talisman', 'sword']]));
    expect(costsClass(full, pieceOf('qi', 'talisman', 9))).toBe(true);
  });
  it('so a stronger piece that ends it reads as a trade', () => {
    const helm = { ...pieceOf('body', 'crown', 9), rarity: 'heaven' as const, rolls: [{ affix: 'sunder' as const, value: 400 }, { affix: 'power' as const, value: 900 }] };
    const w = swing(immortal, helm);
    expect(w.power).toBeGreaterThan(1);
    expect(verdictOf(w)).toBe('trade');
    // On already, it is what holds the class up, so it never reads as costing it.
    expect(wornSwing(ifWorn(immortal, helm), helm).costsClass).toBe(false);
  });
});

/**
 * 量 Every class played, through the climb and forty crossings. The answer the classes
 * were built to: each one a different way up, none of them a wall and none a shortcut.
 */
describe('職 fifteen classes, played out', () => {
  let plain = 0;
  const rows: string[] = [];
  it('plays the plain cultivator for the yardstick', async () => {
    await new Promise((r) => setTimeout(r, 0));
    plain = playPlain();
    expect(plain).toBeGreaterThan(0);
  }, 120_000);
  for (const build of BUILDS) {
    it(`${build}: reachable, climbs and crosses inside the bounds`, async () => {
      // Let the worker breathe between the long runs, or its own messages time out.
      await new Promise((r) => setTimeout(r, 0));
      const r = playClass(build);
      rows.push(`    ${build.padEnd(14)} realm 9 on day ${r.realm9.toFixed(1).padStart(5)}   class held ${String(Math.round(100 * r.held)).padStart(3)}%` +
        `   40 crossings ${String(r.crossings.reduce((a, x) => a + x, 0)).padStart(4)} days, longest ${Math.max(...r.crossings)}`);
      expect(r.held, `${build} is reachable`).toBeGreaterThan(0);
      expect(r.realm9, `${build} climbs`).toBeLessThan(plain * 1.15);
      expect(r.realm9, `${build} is not a shortcut`).toBeGreaterThan(plain * 0.8);
      expect(r.crossings, `${build} crosses forty`).toHaveLength(40);
      for (const d of r.crossings) expect(d, `${build} crosses`).toBeLessThanOrEqual(MAX_MARK_DAYS);
    }, 120_000);
  }
  it('prints the table', () => {
    console.log(`\n  職 every class, played by the active cultivator (plain: realm 9 on day ${plain.toFixed(1)}):\n${rows.join('\n')}\n`);
    expect(rows).toHaveLength(15);
  });
});
