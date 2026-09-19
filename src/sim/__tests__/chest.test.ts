import { describe, expect, it } from 'vitest';
import { commonsOf, wardenOf } from '../../data/bestiary.ts';
import {
  ARCHETYPES, GEAR, RARITIES, RARITY_INFO, SLOTS, TEMPLATE_BY_KEY, archetypesOf,
  baseValue, setBonus, type Item, type Rarity,
} from '../../data/gear.ts';
import { CHEST_LIMIT, FUSE_COUNT, addToChest, equip, fusable, fuse, unequip } from '../chest.ts';
import { rollDrop } from '../drops.ts';
import { newState, power, validate } from '../state.ts';

/** A plain piece: its template's own line at its rank's base, and nothing else. */
const mk = (template: string, rarity: Rarity, n: number): Item => {
  const tpl = TEMPLATE_BY_KEY[template];
  return {
    id: `${template}-${rarity}-${n}`,
    template,
    rarity,
    rolls: [{ affix: tpl.affix, value: baseValue(tpl, rarity, tpl.affix) }],
  };
};

const primary = (it: Item) => it.rolls[0].value;

describe('器 the table', () => {
  it('offers every shape in every realm — nine per slot, at all nine depths', () => {
    expect(ARCHETYPES.length).toBe(54);
    expect(GEAR.length).toBe(54 * 9);

    for (const slot of SLOTS) {
      const shapes = archetypesOf(slot);
      expect(shapes.length).toBe(9);
      // The whole point of splitting shape from realm: at any realm, a full slate.
      for (let realm = 1; realm <= 9; realm++) {
        const here = GEAR.filter((g) => g.slot === slot && g.realm === realm);
        expect(here.length).toBe(9);
        expect(new Set(here.map((g) => g.archetype)).size).toBe(9);
      }
    }

    // A chest full of the same drawing is a chest full of one idea: one icon per shape.
    expect(new Set(ARCHETYPES.map((x) => x.icon)).size).toBe(ARCHETYPES.length);
    expect(new Set(GEAR.map((g) => g.key)).size).toBe(GEAR.length);
  });

  it('gives every slot several axes, so no slot serves one path alone', () => {
    const rows = SLOTS.map((slot) => {
      const axes = new Set(archetypesOf(slot).map((x) => x.affix));
      expect(axes.size).toBeGreaterThanOrEqual(3);
      return `  ${slot.padEnd(9)} ${[...axes].join(' ')}`;
    });
    console.log(`\n  ${GEAR.length} pieces · axes per slot:\n${rows.join('\n')}\n`);
  });
});

describe('藏 the chest', () => {
  it('refuses a drop once it is full, rather than silently eating it', () => {
    const chest = Array.from({ length: CHEST_LIMIT }, (_, i) => mk('sword1', 'common', i));
    expect(addToChest(chest, mk('crescent5', 'spirit', 99))).toBeNull();
    expect(addToChest(chest.slice(1), mk('crescent5', 'spirit', 99))).toHaveLength(CHEST_LIMIT);
  });

  it('equipping swaps, so it can never overflow a full chest', () => {
    const worn = { weapon: mk('sword1', 'common', 0) };
    const chest = Array.from({ length: CHEST_LIMIT }, (_, i) => mk('crescent5', 'spirit', i));
    const after = equip(worn, chest, chest[0], 'weapon');
    expect(after.chest.length).toBe(CHEST_LIMIT);
    expect(after.worn.weapon?.id).toBe(chest[0].id);
    expect(after.chest.some((x) => x.id === 'sword1-common-0')).toBe(true);
  });

  it('unequipping into a full chest is refused, not dropped on the floor', () => {
    const worn = { weapon: mk('sword1', 'common', 0) };
    const full = Array.from({ length: CHEST_LIMIT }, (_, i) => mk('crescent5', 'spirit', i));
    const refused = unequip(worn, full, 'weapon');
    expect(refused.refused).toBe(true);
    expect(refused.worn.weapon).toBeDefined();

    const ok = unequip(worn, full.slice(1), 'weapon');
    expect(ok.refused).toBe(false);
    expect(ok.worn.weapon).toBeUndefined();
  });
});

describe('煉 fusion', () => {
  it('turns three into one of the rank above', () => {
    const chest = [0, 1, 2].map((i) => mk('crescent5', 'spirit', i));
    expect(fusable(chest)).toHaveLength(1);

    const { chest: after, made } = fuse(chest, 'crescent5', 'spirit');
    expect(made?.rarity).toBe('mystic');
    expect(after).toHaveLength(1);
    expect(primary(made!)).toBeGreaterThan(primary(chest[0]));
  });

  it('will not fuse two, and will not fuse past the top rank', () => {
    const two = [0, 1].map((i) => mk('crescent5', 'spirit', i));
    expect(fuse(two, 'crescent5', 'spirit').made).toBeNull();
    expect(fusable(two)).toHaveLength(0);

    const top = [0, 1, 2].map((i) => mk('crescent5', 'heaven', i));
    expect(fuse(top, 'crescent5', 'heaven').made).toBeNull();
    expect(fusable(top)).toHaveLength(0);
  });

  it('carries the roll quality across, so a lucky roll is never wasted', () => {
    const tpl = TEMPLATE_BY_KEY.crescent5;
    const at = (mult: number) => [0, 1, 2].map((i) => ({
      ...mk('crescent5', 'spirit', i),
      rolls: [{ affix: tpl.affix, value: baseValue(tpl, 'spirit', tpl.affix) * mult }],
    }));
    const a = fuse(at(1.15), 'crescent5', 'spirit').made!;
    const b = fuse(at(0.85), 'crescent5', 'spirit').made!;
    expect(primary(a)).toBeGreaterThan(primary(b));
    console.log(`\n  three lucky 靈 make a 玄 of +${primary(a)}; three poor ones, +${primary(b)}\n`);
  });

  it('climbing every rank by fusion costs 3^4 = 81 common pieces', () => {
    let chest: readonly Item[] = Array.from({ length: FUSE_COUNT ** 4 }, (_, i) => mk('crescent5', 'common', i));
    for (const rarity of RARITIES.slice(0, -1)) {
      while (fuse(chest, 'crescent5', rarity).made) chest = fuse(chest, 'crescent5', rarity).chest;
    }
    const heaven = chest.filter((x) => x.rarity === 'heaven');
    expect(heaven).toHaveLength(1);
    console.log(`  81 凡 pieces melt down into exactly one 天 at +${primary(heaven[0])}\n`);
  });
});

describe('what is worn changes the cultivator', () => {
  it('raises power, and a bare body changes nothing', () => {
    const bare = newState(0);
    // 天鐮 now rolls 氣, so power has to be tested with a piece that actually gives it.
    const armed = { ...bare, worn: { weapon: mk('trident9', 'heaven', 0) } };
    expect(TEMPLATE_BY_KEY.trident9.affix).toBe('power');
    expect(power(armed)).toBeGreaterThan(power(bare));
    expect(setBonus({}).power).toBe(1);
  });

  it('prints what each rank of a full set is worth', () => {
    const rows = RARITIES.map((rarity) => {
      const worn = Object.fromEntries(SLOTS.map((slot) => {
        const tpl = GEAR.filter((g) => g.slot === slot).sort((a, b) => b.realm - a.realm)[0];
        return [slot, mk(tpl.key, rarity, 0)];
      }));
      const b = setBonus(worn);
      return `  ${RARITY_INFO[rarity].han} ${RARITY_INFO[rarity].name.padEnd(7)} 力 x${b.power.toFixed(2)}   氣 x${b.rate.toFixed(2)}`;
    });
    console.log(`\n  a full set of the ninth-realm piece in every slot:\n${rows.join('\n')}\n`);
  });
});

describe('a save carrying gear is still input', () => {
  it('drops pieces that do not exist, duplicated ids, and anything over the limit', () => {
    const s = validate({
      ...newState(1000),
      worn: { weapon: { id: 'a', template: 'notathing', rarity: 'heaven', rolls: [{ affix: 'power', value: 999 }] } },
      chest: [
        { id: 'b', template: 'crescent5', rarity: 'spirit', rolls: [{ affix: 'power', value: 11 }] },
        { id: 'b', template: 'crescent5', rarity: 'spirit', rolls: [{ affix: 'power', value: 11 }] },  // same id twice
        ...Array.from({ length: 80 }, (_, i) => ({ id: `c${i}`, template: 'sword1', rarity: 'common', rolls: [{ affix: 'power', value: 7 }] })),
      ],
    }, 1000);

    expect(s.worn.weapon).toBeUndefined();
    expect(s.chest.length).toBeLessThanOrEqual(CHEST_LIMIT);
    expect(new Set(s.chest.map((x) => x.id)).size).toBe(s.chest.length);
  });

  it('refuses a piece worn in a slot it does not belong to', () => {
    const s = validate({
      ...newState(1000),
      worn: { crown: { id: 'x', template: 'crescent5', rarity: 'heaven', rolls: [{ affix: 'power', value: 40 }] } },
    }, 1000);
    expect(s.worn.crown).toBeUndefined();
  });

  it('caps an edited percentage', () => {
    const s = validate({
      ...newState(1000),
      worn: { weapon: { id: 'x', template: 'crescent5', rarity: 'common', rolls: [{ affix: 'power', value: 1e9 }] } },
    }, 1000);
    expect(s.worn.weapon!.rolls[0].value).toBeLessThanOrEqual(120);
  });
});

describe('落 what the beasts actually give', () => {
  it('fills a chest from real kills, and every piece is wearable', () => {
    let chest: readonly Item[] = [];
    let kills = 0;
    for (let i = 0; i < 5000 && chest.length < CHEST_LIMIT; i++) {
      kills++;
      const beast = i % 40 === 0 ? wardenOf(5) : commonsOf(5)[i % 3];
      const drop = rollDrop(beast, 5, i);
      if (!drop) continue;
      const next = addToChest(chest, drop);
      if (next) chest = next;
    }
    expect(chest.length).toBe(CHEST_LIMIT);
    for (const it of chest) expect(TEMPLATE_BY_KEY[it.template]).toBeDefined();

    const ranks = RARITIES.map((r) => `${RARITY_INFO[r].han} ${chest.filter((x) => x.rarity === r).length}`);
    console.log(`\n  ${kills} kills filled a ${CHEST_LIMIT}-slot chest — ${ranks.join(' · ')}\n`);
  });
});
