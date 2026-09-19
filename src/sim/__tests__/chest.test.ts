import { describe, expect, it } from 'vitest';
import { commonsOf, wardenOf } from '../../data/bestiary.ts';
import {
  GEAR, RARITIES, RARITY_INFO, SLOTS, TEMPLATE_BY_KEY, basePercent, setBonus,
  type Item, type Rarity,
} from '../../data/gear.ts';
import { CHEST_LIMIT, FUSE_COUNT, addToChest, equip, fusable, fuse, unequip } from '../chest.ts';
import { rollDrop } from '../drops.ts';
import { newState, power, validate } from '../state.ts';

const mk = (template: string, rarity: Rarity, n: number): Item => ({
  id: `${template}-${rarity}-${n}`,
  template,
  rarity,
  percent: basePercent(TEMPLATE_BY_KEY[template], rarity),
});

describe('器 the table', () => {
  it('has nine pieces per slot, one per realm, and no repeated artwork', () => {
    expect(GEAR.length).toBe(54);
    for (const slot of SLOTS) {
      const ofSlot = GEAR.filter((g) => g.slot === slot);
      expect(ofSlot.length).toBe(9);
      expect(new Set(ofSlot.map((g) => g.realm)).size).toBe(9);
    }
    // A chest full of the same drawing is a chest full of one idea.
    expect(new Set(GEAR.map((g) => g.icon)).size).toBe(GEAR.length);
    expect(new Set(GEAR.map((g) => g.key)).size).toBe(GEAR.length);
  });
});

describe('藏 the chest', () => {
  it('refuses a drop once it is full, rather than silently eating it', () => {
    const chest = Array.from({ length: CHEST_LIMIT }, (_, i) => mk('ironsword', 'common', i));
    expect(addToChest(chest, mk('moonblade', 'spirit', 99))).toBeNull();
    expect(addToChest(chest.slice(1), mk('moonblade', 'spirit', 99))).toHaveLength(CHEST_LIMIT);
  });

  it('equipping swaps, so it can never overflow a full chest', () => {
    const worn = { weapon: mk('ironsword', 'common', 0) };
    const chest = Array.from({ length: CHEST_LIMIT }, (_, i) => mk('moonblade', 'spirit', i));
    const after = equip(worn, chest, chest[0], 'weapon');
    expect(after.chest.length).toBe(CHEST_LIMIT);
    expect(after.worn.weapon?.id).toBe(chest[0].id);
    expect(after.chest.some((x) => x.id === 'ironsword-common-0')).toBe(true);
  });

  it('unequipping into a full chest is refused, not dropped on the floor', () => {
    const worn = { weapon: mk('ironsword', 'common', 0) };
    const full = Array.from({ length: CHEST_LIMIT }, (_, i) => mk('moonblade', 'spirit', i));
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
    const chest = [0, 1, 2].map((i) => mk('moonblade', 'spirit', i));
    expect(fusable(chest)).toHaveLength(1);

    const { chest: after, made } = fuse(chest, 'moonblade', 'spirit');
    expect(made?.rarity).toBe('mystic');
    expect(after).toHaveLength(1);
    expect(made!.percent).toBeGreaterThan(chest[0].percent);
  });

  it('will not fuse two, and will not fuse past the top rank', () => {
    const two = [0, 1].map((i) => mk('moonblade', 'spirit', i));
    expect(fuse(two, 'moonblade', 'spirit').made).toBeNull();
    expect(fusable(two)).toHaveLength(0);

    const top = [0, 1, 2].map((i) => mk('moonblade', 'heaven', i));
    expect(fuse(top, 'moonblade', 'heaven').made).toBeNull();
    expect(fusable(top)).toHaveLength(0);
  });

  it('carries the roll quality across, so a lucky roll is never wasted', () => {
    const tpl = TEMPLATE_BY_KEY.moonblade;
    const lucky = [0, 1, 2].map((i) => ({ ...mk('moonblade', 'spirit', i), percent: basePercent(tpl, 'spirit') * 1.15 }));
    const poor = [0, 1, 2].map((i) => ({ ...mk('moonblade', 'spirit', i), percent: basePercent(tpl, 'spirit') * 0.85 }));
    const a = fuse(lucky, 'moonblade', 'spirit').made!;
    const b = fuse(poor, 'moonblade', 'spirit').made!;
    expect(a.percent).toBeGreaterThan(b.percent);
    console.log(`\n  three lucky 靈 make a 玄 of +${a.percent}%; three poor ones, +${b.percent}%\n`);
  });

  it('climbing every rank by fusion costs 3^4 = 81 common pieces', () => {
    let chest: readonly Item[] = Array.from({ length: FUSE_COUNT ** 4 }, (_, i) => mk('moonblade', 'common', i));
    for (const rarity of RARITIES.slice(0, -1)) {
      while (fuse(chest, 'moonblade', rarity).made) chest = fuse(chest, 'moonblade', rarity).chest;
    }
    const heaven = chest.filter((x) => x.rarity === 'heaven');
    expect(heaven).toHaveLength(1);
    console.log(`  81 凡 pieces melt down into exactly one 天 at +${heaven[0].percent}%\n`);
  });
});

describe('what is worn changes the cultivator', () => {
  it('raises power, and a bare body changes nothing', () => {
    const bare = newState(0);
    const armed = { ...bare, worn: { weapon: mk('heavenscythe', 'heaven', 0) } };
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
      worn: { weapon: { id: 'a', template: 'notathing', rarity: 'heaven', percent: 999 } },
      chest: [
        { id: 'b', template: 'moonblade', rarity: 'spirit', percent: 11 },
        { id: 'b', template: 'moonblade', rarity: 'spirit', percent: 11 },   // same id twice
        ...Array.from({ length: 80 }, (_, i) => ({ id: `c${i}`, template: 'ironsword', rarity: 'common', percent: 7 })),
      ],
    }, 1000);

    expect(s.worn.weapon).toBeUndefined();
    expect(s.chest.length).toBeLessThanOrEqual(CHEST_LIMIT);
    expect(new Set(s.chest.map((x) => x.id)).size).toBe(s.chest.length);
  });

  it('refuses a piece worn in a slot it does not belong to', () => {
    const s = validate({
      ...newState(1000),
      worn: { crown: { id: 'x', template: 'moonblade', rarity: 'heaven', percent: 40 } },
    }, 1000);
    expect(s.worn.crown).toBeUndefined();
  });

  it('caps an edited percentage', () => {
    const s = validate({
      ...newState(1000),
      worn: { weapon: { id: 'x', template: 'moonblade', rarity: 'common', percent: 1e9 } },
    }, 1000);
    expect(s.worn.weapon!.percent).toBeLessThanOrEqual(100);
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
