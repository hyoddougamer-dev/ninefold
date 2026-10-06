import { describe, expect, it } from 'vitest';
import { ARCHETYPES, SLOTS, TEMPLATE_BY_KEY, baseValue, callingOf, type Item, type Slot, type Worn } from '../../data/gear.ts';
import { SCHOOL_INFO, type School } from '../../data/schools.ts';
import { PAIR_MELT } from '../balance.ts';
import { addToChest, qualityOf } from '../chest.ts';
import {
  FILTER_LIMIT, adoptFilters, forgetFilter, keepFilter, keepable, keptByFilter, matchesFilter, saveFilter,
  validFilters, type ChestFilter,
} from '../filters.ts';
import { meltFactor, melt } from '../salvage.ts';
import { classMelt, classRefine, gearFuse } from '../schools.ts';
import { assignTask, clearSet, saveSet, taskBody, tasksOf } from '../sets.ts';
import { newState, validate, type State } from '../state.ts';
import { fusionQuality, stash } from '../stash.ts';
import { advance } from '../time.ts';
import { refinePrice } from '../trials.ts';
import { bodiesHeld } from '../verify.ts';

const T0 = 1_700_000_000;

/** One piece of a school in a place, the first shape that has both. */
const pieceOf = (school: School, slot: Slot, id: string, extra: Item['rolls'] = []): Item => {
  const a = ARCHETYPES.find((x) => x.slot === slot && SCHOOL_INFO[school].axes.includes(x.affix))!;
  const tpl = TEMPLATE_BY_KEY[`${a.key}6`];
  return { id, template: tpl.key, rarity: 'earth', rolls: [{ affix: tpl.affix, value: 40 }, ...extra] };
};
const fits = (school: School, slot: Slot) => ARCHETYPES.some((x) => x.slot === slot && SCHOOL_INFO[school].axes.includes(x.affix));

/** 職 A body of two schools, three places each: the first split of the six places that fits both. */
const pairBody = (a: School, b: School, tag: string): Worn => {
  for (let mask = 0; mask < 1 << SLOTS.length; mask++) {
    const plan = SLOTS.map((slot, i) => [slot, mask & (1 << i) ? a : b] as const);
    if (plan.filter(([, s]) => s === a).length !== 3) continue;
    if (!plan.every(([slot, s]) => fits(s, slot))) continue;
    return Object.fromEntries(plan.map(([slot, s]) => [slot, pieceOf(s, slot, `${tag}-${slot}`)]));
  }
  throw new Error(`no ${a}+${b} body`);
};
/** 職 A body of one school in every place it fits. */
const pureBody = (sc: School, tag: string): Worn =>
  Object.fromEntries(SLOTS.filter((slot) => fits(sc, slot)).map((slot) => [slot, pieceOf(sc, slot, `${tag}-${slot}`)]));

const at = (over: Partial<State> = {}): State => ({ ...newState(T0), realm: 6, layer: 5, ...over });

/** Save `worn` as a loadout, then put `then` back on with the loadout's pieces in the chest. */
function withLoadout(worn: Worn, then: Worn, name = 'Job'): State {
  const saved = saveSet(at({ worn }), 0, name);
  return { ...saved, worn: then, chest: [...saved.chest, ...Object.values(worn).filter((x): x is Item => !!x)] };
}

describe('套 a loadout given a task', () => {
  const smith = pairBody('fortune', 'artificer', 'ts');
  const sword = pureBody('sword', 'sw');

  it('is a Treasure Smith body, and the sword body is not', () => {
    expect(callingOf(smith).pair?.key).toBe('treasuresmith');
    expect(callingOf(sword).kind).toBe('pure');
  });

  it('reads nothing new until it is given: no task is what is worn, as it always was', () => {
    const s = withLoadout(smith, sword);
    expect(taskBody(s, 'melt')).toBe(s);
    expect(meltFactor(s)).toBe(meltFactor({ ...s, sets: [] }));
    expect(classMelt(s)).toBe(1);
  });

  it('melts at the loadout’s class and leaves what is worn on the body', () => {
    const s = assignTask(withLoadout(smith, sword), 'melt', 0);
    expect(s.tasks.melt).toBe(0);
    expect(s.worn).toEqual(sword);
    expect(meltFactor(s) / meltFactor({ ...s, tasks: {} })).toBeCloseTo(PAIR_MELT, 9);
    // The allowance pays through it too: the same pile pays the Smith's share.
    const junk = pieceOf('qi', 'ring', 'junk');
    const pile = [{ ...junk, template: junk.template.replace(/\d+$/, '1') }];
    const plain = melt({ ...s, tasks: {} }, pile).qi;
    expect(melt(s, pile).qi / plain).toBeCloseTo(PAIR_MELT, 1);
    // And the allowance refills at the Smith's pace, as the class says it does.
    const drained = { ...s, melt: 0 };
    const filled = advance(drained, drained.at + 1000).melt;
    const plainFill = advance({ ...drained, tasks: {} }, drained.at + 1000).melt;
    expect(filled / plainFill).toBeCloseTo(PAIR_MELT, 6);
  });

  it('refines at the loadout’s price and fuses at the loadout’s fusion line', () => {
    const artificer = pureBody('artificer', 'ar');
    const s0 = withLoadout(artificer, sword, 'Smithy');
    const s = assignTask(s0, 'refine', 0);
    expect(classRefine(taskBody(s, 'refine'))).toBeLessThan(1);
    expect(refinePrice(s, 'weapon')!).toBeLessThan(refinePrice(s0, 'weapon')!);
    expect(s.worn).toBe(s0.worn);

    // 煉 A loadout carrying the fusion line, worn as a ring.
    const ring = { ...sword.ring ?? pieceOf('fortune', 'ring', 'r0'), id: 'fusering',
      rolls: [{ affix: 'refine' as const, value: 60 }] };
    const fuser = { ...sword, ring };
    const f0 = withLoadout(fuser, sword, 'Furnace');
    const f = assignTask(f0, 'fuse', 0);
    expect(gearFuse(taskBody(f, 'fuse'))).toBeGreaterThan(gearFuse(f));
    expect(fusionQuality(f)).toBeGreaterThan(fusionQuality(f0));
  });

  it('is always one of the bodies the server already allows for', () => {
    const s = assignTask(assignTask(withLoadout(smith, sword), 'melt', 0), 'fuse', 0);
    const worn = taskBody(s, 'melt').worn;
    expect(bodiesHeld(s).some((b) => JSON.stringify(b.worn) === JSON.stringify(worn))).toBe(true);
  });

  it('follows its loadout when one before it is forgotten, and goes back to what is worn with its own', () => {
    let s = withLoadout(smith, sword, 'A');
    s = { ...saveSet(s, 1, 'B'), worn: sword };
    s = assignTask(assignTask(s, 'melt', 1), 'fuse', 0);
    expect(tasksOf(s, 1)).toEqual(['melt']);
    const after = clearSet(s, 0);
    expect(after.tasks).toEqual({ melt: 0 });
    expect(clearSet(after, 0).tasks).toEqual({});
  });

  it('is refused for a loadout that does not exist, and cleared with null', () => {
    const s = withLoadout(smith, sword);
    expect(assignTask(s, 'melt', 3)).toBe(s);
    expect(assignTask(s, 'nope' as never, 0)).toBe(s);
    expect(assignTask(assignTask(s, 'melt', 0), 'melt', null).tasks).toEqual({});
  });

  it('survives a save, and a save is input: only an index that exists', () => {
    const s = assignTask(withLoadout(smith, sword), 'refine', 0);
    expect(validate(JSON.parse(JSON.stringify(s)), T0).tasks).toEqual({ refine: 0 });
    const forged = { ...JSON.parse(JSON.stringify(s)), tasks: { melt: 4, fuse: -1, refine: 0.5, other: 0 } };
    expect(validate(forged, T0).tasks).toEqual({});
    expect(validate({ ...forged, sets: undefined, tasks: { melt: 0 } }, T0).tasks).toEqual({});
  });
});

describe('鎖 a kept filter and a full chest', () => {
  /** A piece rolled exactly at its rank's usual value, so its worth is its rank and realm. */
  const fair = (id: string, template: string, rarity: Item['rarity']): Item => {
    const tpl = TEMPLATE_BY_KEY[template];
    return { id, template, rarity, rolls: [{ affix: tpl.affix, value: baseValue(tpl, rarity, tpl.affix) }] };
  };
  const weapon = (id: string, rarity: Item['rarity'] = 'common'): Item => fair(id, 'sword2', rarity);
  const ringKey = pieceOf('fortune', 'ring', 'x').template.replace(/\d+$/, '2');
  const ring = (id: string): Item => fair(id, ringKey, 'common');
  const keepRings: ChestFilter = { name: 'Rings', slot: 'ring', school: 'any', lines: [], keep: true };

  it('matches by place, school and lines, off the piece alone', () => {
    const r = ring('r');
    expect(matchesFilter({ slot: 'ring', school: 'any', lines: [] }, r)).toBe(true);
    expect(matchesFilter({ slot: 'weapon', school: 'any', lines: [] }, r)).toBe(false);
    expect(matchesFilter({ slot: 'all', school: 'fortune', lines: [] }, r)).toBe(true);
    expect(matchesFilter({ slot: 'all', school: 'sword', lines: [] }, r)).toBe(false);
    expect(matchesFilter({ slot: 'all', school: 'any', lines: [r.rolls[0].affix] }, r)).toBe(true);
    expect(matchesFilter({ slot: 'all', school: 'any', lines: ['art'] }, r)).toBe(false);
    // ▲ Better reads a fight: never kept, never matched here.
    expect(matchesFilter({ slot: 'better', school: 'any', lines: [] }, r)).toBe(false);
    expect(keepable({ slot: 'better', school: 'any', lines: [] })).toBe(false);
    expect(keepable({ slot: 'all', school: 'any', lines: [] })).toBe(false);
  });

  it('melts the worst piece no kept filter shows before any piece one shows', () => {
    const worst = ring('worst');
    const chest = [worst, weapon('mid', 'earth')];
    const spare = (it: Item) => keptByFilter([keepRings], it);
    // Without the filter the ring (worth least) is melted; with it, the weapon goes.
    expect(addToChest(chest, weapon('new', 'heaven'), 2).dropped?.id).toBe('worst');
    expect(addToChest(chest, weapon('new', 'heaven'), 2, spare).dropped?.id).toBe('mid');
  });

  it('melts a new piece no kept filter shows when every piece in the chest is kept, however strong', () => {
    const chest = [ring('a'), ring('b')];
    const spare = (it: Item) => keptByFilter([keepRings], it);
    const out = addToChest(chest, weapon('new', 'heaven'), 2, spare);
    expect(out.dropped?.id).toBe('new');
    expect(out.chest.map((x) => x.id)).toEqual(['a', 'b']);
  });

  it('is what stash() reads, the one way a drop goes into the chest', () => {
    const many = Array.from({ length: 200 }, (_, i) => ring(`r${i}`));
    const s = { ...at({ chest: many }), filters: [keepRings] };
    const out = stash(s, weapon('w', 'heaven'));
    expect(out.state.chest.map((x) => x.id)).toEqual(many.map((x) => x.id));
    expect(out.dropped?.id).toBe('w');
    const plain = stash({ ...s, filters: [{ ...keepRings, keep: undefined }] as ChestFilter[] }, weapon('w', 'heaven'));
    expect(plain.dropped?.id).not.toBe('w');
  });

  /**
   * 熔 rekaris, on the Discord: *"I have Power filter, I get heaven rank Power-filter item, an
   * Earth rank with lower quality should still get pushed out and melted, so the result is the
   * truly best stuff I might want."* Kept pieces are weighed against each other, and a piece
   * outside the filter is never weighed as stronger than one inside it.
   */
  describe('熔 weighs the kept filters first, then strength', () => {
    const keepPower: ChestFilter = { name: 'Power', slot: 'all', school: 'any', lines: ['power'], keep: true };
    const kept = (it: Item) => keptByFilter([keepPower], it);
    /** A 力 power sword at `quality` of its rank's usual roll. */
    const power = (id: string, rarity: Item['rarity'], quality = 1, extra: Partial<Item> = {}): Item => {
      const p = fair(id, 'sword6', rarity);
      return { ...p, rolls: [{ ...p.rolls[0], value: p.rolls[0].value * quality }], ...extra };
    };
    /** A piece no Power filter shows: a 黃玉 Topaz, which rolls rate. */
    const other = (id: string, rarity: Item['rarity']): Item => fair(id, 'topaz6', rarity);

    it('pushes the Earth Power piece out for the Heaven one, where it used to melt the Heaven one', () => {
      const chest = [power('h1', 'heaven'), power('earth', 'earth', 0.9), power('h2', 'heaven')];
      expect(chest.every(kept)).toBe(true);
      const out = addToChest(chest, power('new', 'heaven'), 3, kept);
      expect(out.dropped?.id).toBe('earth');
      expect(out.chest.map((x) => x.id)).toEqual(['h1', 'new', 'h2']);
    });

    it('keeps the stronger of two kept pieces by quality, and the one already there on a tie', () => {
      const chest = [power('low', 'heaven', 0.95), power('high', 'heaven', 1.2)];
      expect(addToChest(chest, power('new', 'heaven', 1.1), 2, kept).dropped?.id).toBe('low');
      expect(addToChest(chest, power('same', 'heaven', 0.95), 2, kept).dropped?.id).toBe('same');
      expect(addToChest(chest, power('worse', 'earth'), 2, kept).dropped?.id).toBe('worse');
    });

    it('never weighs a piece outside the filter as stronger than one inside it', () => {
      // The Heaven Topaz is the strongest piece here and the new Common sword the weakest.
      const chest = [other('topaz', 'heaven'), power('p', 'earth')];
      expect(addToChest(chest, power('new', 'common'), 2).dropped?.id).toBe('new');
      const out = addToChest(chest, power('new', 'common'), 2, kept);
      expect(out.dropped?.id).toBe('topaz');
      expect(out.chest.map((x) => x.id)).toEqual(['new', 'p']);
    });

    it('still never melts a locked piece, kept or not', () => {
      const chest = [power('locked', 'common', 1, { locked: true }), power('h', 'heaven')];
      expect(addToChest(chest, power('new', 'heaven', 1.2), 2, kept).dropped?.id).toBe('h');
      const held = chest.slice(0, 1);
      const out = addToChest(held, power('new', 'heaven', 1.2), 1, kept);
      expect(out.dropped?.id).toBe('new');
      expect(out.chest).toEqual(held);
    });

    it('is what a drop does through stash(), with the filters the save holds', () => {
      const many = [...Array.from({ length: 199 }, (_, i) => power(`h${i}`, 'heaven')), power('earth', 'earth', 0.9)];
      const s = { ...at({ chest: many }), filters: [keepPower] };
      const out = stash(s, power('new', 'heaven'));
      expect(out.dropped?.id).toBe('earth');
      expect(out.unkept).toBe(false);
      expect(out.state.chest.some((x) => x.id === 'new')).toBe(true);
      expect(out.state.chest.length).toBe(many.length);
      // A piece no kept filter shows melts itself, however strong, rather than take a kept one's place.
      expect(stash(s, other('topaz', 'heaven')).dropped?.id).toBe('topaz');
      // 熔 And a stronger piece pushed out for a kept one is said to be unkept, not the weakest.
      const mixed = { ...s, chest: [other('topaz', 'heaven'), ...many.slice(1)] };
      const pushed = stash(mixed, power('weak', 'common'));
      expect(pushed.dropped?.id).toBe('topaz');
      expect(pushed.unkept).toBe(true);
      expect(stash({ ...mixed, filters: [] }, power('weak', 'common')).unkept).toBe(false);
    });
  });

  it('is kept, forgotten and validated as a save', () => {
    let s = saveFilter(at(), { name: 'Rings', slot: 'ring', school: 'any', lines: [] });
    s = keepFilter(s, 0, true);
    expect(s.filters[0].keep).toBe(true);
    expect(keepFilter(saveFilter(s, { name: 'Up', slot: 'better', school: 'any', lines: [] }), 1, true).filters[1].keep).toBeUndefined();
    expect(validate(JSON.parse(JSON.stringify(s)), T0).filters).toEqual(s.filters);
    expect(forgetFilter(s, 0).filters).toEqual([]);
    const forged = validFilters([
      { name: 'x', slot: 'nowhere', school: 'any', lines: [] },
      { name: 'y', slot: 'better', school: 'any', lines: [], keep: true },
      { name: 'z\u0001', slot: 'ring', school: 'sword', lines: ['power', 'power', 'bogus'], keep: 'yes' },
      ...Array.from({ length: 20 }, (_, i) => ({ name: `f${i}`, slot: 'all', school: 'any', lines: ['power'] })),
    ]);
    expect(forged.length).toBe(FILTER_LIMIT - 1);
    expect(forged[0]).toEqual({ name: 'y', slot: 'better', school: 'any', lines: [] });
    expect(forged[1]).toEqual({ name: 'z', slot: 'ring', school: 'sword', lines: ['power'] });
  });

  it('takes in a device’s old filters once, never doubling one and never keeping one', () => {
    const device = [{ name: 'Rings', slot: 'ring', school: 'any', lines: [] }, { name: 'Luck', slot: 'all', school: 'any', lines: ['luck'] }];
    const s = adoptFilters(at(), device);
    expect(s.filters.map((f) => f.name)).toEqual(['Rings', 'Luck']);
    expect(adoptFilters(s, device)).toBe(s);
    expect(adoptFilters(at(), 'nonsense').filters).toEqual([]);
  });

  it('is the next thing a chest over its limit gives up after the locked ones, on a load', () => {
    const many = Array.from({ length: 160 }, (_, i) => (i % 2 ? ring(`r${i}`) : weapon(`w${i}`, 'heaven')));
    const kept = validate({ ...at(), chest: many, filters: [keepRings] }, T0).chest;
    const plain = validate({ ...at(), chest: many }, T0).chest;
    expect(kept.length).toBeLessThan(many.length);
    expect(kept.length).toBeLessThanOrEqual(80);
    // Every place goes to a kept ring before any heaven sword; without the filter, the swords win.
    expect(kept.every((x) => x.id.startsWith('r'))).toBe(true);
    expect(plain.every((x) => x.id.startsWith('w'))).toBe(true);
  });
});

describe('質 quality', () => {
  it('reads the same number the tile and the sheet print', () => {
    const p = pieceOf('sword', 'weapon', 'q');
    expect(qualityOf(p)).toBeGreaterThan(0);
    expect(qualityOf({ ...p, rolls: [{ ...p.rolls[0], value: p.rolls[0].value * 2 }] })).toBeCloseTo(qualityOf(p) * 2, 6);
  });
});
