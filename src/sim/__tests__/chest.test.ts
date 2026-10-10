import { describe, expect, it } from 'vitest';
import { commonsOf, wardenOf } from '../../data/bestiary.ts';
import {
  ARCHETYPES, GEAR, RARITIES, RARITY_INFO, SLOTS, TEMPLATE_BY_KEY, archetypesOf,
  FUSED, baseValue, setBonus, type Item, type Rarity,
} from '../../data/gear.ts';
import {
  CHEST_LIMIT, FUSE_COUNT, addToChest, equip, fusable, fuse, itemWorth, qualityOf, unequip,
} from '../chest.ts';
import { fuseAllIn } from '../stash.ts';
import { FUSE_TOP } from '../balance.ts';
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
  it('offers every shape in every realm: nine per slot, at all nine depths', () => {
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
  it('keeps the better piece once it is full, rather than eating the new one', () => {
    const chest = Array.from({ length: CHEST_LIMIT }, (_, i) => mk('sword1', 'common', i));
    expect(chest).toHaveLength(CHEST_LIMIT);

    // A full chest used to refuse, which meant a cultivator hunting properly lost every
    // drop after the fortieth without ever seeing it happen.
    const better = mk('crescent5', 'spirit', 99);
    const kept = addToChest(chest, better);
    expect(kept.chest).toHaveLength(CHEST_LIMIT);
    expect(kept.chest.some((x) => x.id === better.id)).toBe(true);
    expect(kept.dropped?.id).toMatch(/^sword1-common-/);
    expect(itemWorth(better)).toBeGreaterThan(itemWorth(kept.dropped!));

    // And the worse piece is the one that falls, even when it is the one that just did.
    const worse = mk('sword1', 'common', 98);
    const refused = addToChest(kept.chest, worse);
    expect(refused.chest).toBe(kept.chest);
    expect(refused.dropped?.id).toBe(worse.id);

    // With room, nothing is dropped at all.
    const roomy = addToChest(chest.slice(1), better);
    expect(roomy.chest).toHaveLength(CHEST_LIMIT);
    expect(roomy.dropped).toBeNull();
  });

  it('weighs a piece by rank, realm, refining and quality, and by nothing else', () => {
    // Seven axes on different scales cannot be added into a number that means anything,
    // so worth is the four things that are comparable across every piece in the game.
    expect(itemWorth(mk('sword9', 'heaven', 0))).toBeGreaterThan(itemWorth(mk('sword9', 'earth', 0)));
    expect(itemWorth(mk('sword9', 'common', 0))).toBeGreaterThan(itemWorth(mk('sword1', 'common', 0)));
    const plain = mk('sword5', 'mystic', 0);
    // 承 Refining is the place's, so it is handed in: a piece in the chest reads none.
    expect(itemWorth(plain, 8)).toBeGreaterThan(itemWorth(plain));
    const strong = { ...plain, rolls: [{ ...plain.rolls[0], value: plain.rolls[0].value * 1.3 }] };
    expect(qualityOf(strong)).toBeCloseTo(1.3, 2);
    expect(itemWorth(strong)).toBeCloseTo(itemWorth(plain) * qualityOf(strong), 6);
    // A secondary line is not read: only the first, against its own rank's base.
    const extra = { ...plain, rolls: [...plain.rolls, { affix: plain.rolls[0].affix, value: 999 }] };
    expect(itemWorth(extra)).toBe(itemWorth(plain));
  });

  it('melts the weaker roll first when a full chest holds two of the same piece', () => {
    // 質 The case that asked for it: a ×1.30 fused Heaven piece and a ×0.96 Heaven drop of
    // the same template weighed the same, so a full chest could melt the fused one first.
    const at = (n: number, q: number, extra: Partial<Item> = {}): Item => {
      const it = mk('sword9', 'heaven', n);
      return { ...it, rolls: [{ ...it.rolls[0], value: it.rolls[0].value * q }], ...extra };
    };
    const fused = at(1, 1.3, { from: FUSED });
    const weak = at(2, 0.96, { from: 'rat' });
    const filler = Array.from({ length: CHEST_LIMIT - 2 }, (_, i) => at(10 + i, 1.1));
    const drop = at(99, 1.0, { from: 'rat' });

    // Either order in the chest: the ×0.96 piece is the one that goes.
    for (const chest of [[fused, weak, ...filler], [weak, fused, ...filler], [...filler, fused, weak]]) {
      const kept = addToChest(chest, drop);
      expect(kept.dropped?.id).toBe(weak.id);
      expect(kept.chest.some((x) => x.id === fused.id)).toBe(true);
      expect(kept.chest.some((x) => x.id === drop.id)).toBe(true);
    }

    // A drop weaker than the weakest held is the one that melts.
    const poor = at(98, 0.9, { from: 'rat' });
    expect(addToChest([fused, weak, ...filler], poor).dropped?.id).toBe(poor.id);

    // 鎖 The protection holds: a locked piece (and a loadout's, which saving locks) is never
    // the one, however weak its roll. The next weakest goes instead. 承 A piece once
    // refined needs no sparing any more: its levels are its place's, not its own.
    const lockedWeak = { ...weak, locked: true as const };
    const guarded = [fused, lockedWeak, ...filler];
    const out = addToChest(guarded, at(95, 1.2, { from: 'rat' }));
    expect(out.dropped?.id).not.toBe(lockedWeak.id);
    expect(out.dropped?.id).not.toBe(fused.id);
    expect(out.dropped?.id).toMatch(/^sword9-heaven-1\d$/);
    expect(out.chest).toContain(lockedWeak);

    // Every piece kept: the new one goes, nothing chosen is taken.
    const allKept = [fused, weak, ...filler].map((x) => ({ ...x, locked: true as const }));
    expect(addToChest(allKept, at(97, 1.5)).dropped?.id).toBe('sword9-heaven-97');

    // And a save past its chest's room keeps the better roll too (state.ts validate).
    // Two past the room: the ×0.96 and the ×1.00 are the two that go.
    const over = validate({ ...newState(0), realm: 9, chest: [weak, fused, ...filler, drop, at(96, 1.2)] }, 0);
    expect(over.chest).toHaveLength(CHEST_LIMIT);
    expect(over.chest.some((x) => x.id === fused.id)).toBe(true);
    expect(over.chest.some((x) => x.id === 'sword9-heaven-96')).toBe(true);
    expect(over.chest.some((x) => x.id === weak.id)).toBe(false);
    expect(over.chest.some((x) => x.id === drop.id)).toBe(false);
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

  it('will not fuse two, and at Heaven will not fuse a piece nobody can say was found', () => {
    const two = [0, 1].map((i) => mk('crescent5', 'spirit', i));
    expect(fuse(two, 'crescent5', 'spirit').made).toBeNull();
    expect(fusable(two)).toHaveLength(0);

    // A piece with no word of where it came from (from before the drops said) is kept.
    const top = [0, 1, 2].map((i) => mk('crescent5', 'heaven', i));
    expect(fuse(top, 'crescent5', 'heaven').made).toBeNull();
    expect(fusable(top)).toHaveLength(0);
  });

  /**
   * 天 Heaven into Heaven (rekaris, on the Discord, 2026-10-04): three found Heaven
   * pieces make one Heaven piece, with the fusion quality on top and FUSE_TOP over it,
   * and a piece a fusion made never goes in again, so Fuse all cannot fold a chest of
   * Heaven into one piece.
   */
  it('fuses three found Heaven pieces into one, once, and never past FUSE_TOP', () => {
    const tpl = TEMPLATE_BY_KEY.crescent5;
    const found = (i: number, mult: number): Item => ({
      ...mk('crescent5', 'heaven', i), from: 'rat',
      rolls: [{ affix: tpl.affix, value: baseValue(tpl, 'heaven', tpl.affix) * mult }],
    });
    const three = [found(0, 1.0), found(1, 1.1), found(2, 1.2)];
    expect(fusable(three)).toEqual([{ template: 'crescent5', rarity: 'heaven', count: 3 }]);

    const plain = fuse(three, 'crescent5', 'heaven').made!;
    expect(plain.rarity).toBe('heaven');
    expect(plain.from).toBe(FUSED);
    expect(qualityOf(plain)).toBeCloseTo(1.1, 2);              // the average, times 1
    expect(qualityOf(fuse(three, 'crescent5', 'heaven', 1.2).made!)).toBeCloseTo(1.32, 2);
    expect(qualityOf(fuse(three, 'crescent5', 'heaven', 9).made!)).toBeCloseTo(FUSE_TOP, 2);

    // The made piece is never one of three: two more found ones do not make a group.
    const after = [...fuse(three, 'crescent5', 'heaven').chest, found(3, 1), found(4, 1)];
    expect(fusable(after)).toHaveLength(0);
    // And a Heaven piece fused up from Earth is not one of three either.
    const fromEarth = fuse([0, 1, 2].map((i) => mk('crescent5', 'earth', i)), 'crescent5', 'earth').made!;
    expect(fusable([fromEarth, found(5, 1), found(6, 1)])).toHaveLength(0);
  });

  it('Fuse all goes round the Heaven pieces once, and never folds them into one', () => {
    const tpl = TEMPLATE_BY_KEY.crescent5;
    const chest: Item[] = Array.from({ length: 27 }, (_, i) => ({
      ...mk('crescent5', 'heaven', i), from: 'rat',
      rolls: [{ affix: tpl.affix, value: baseValue(tpl, 'heaven', tpl.affix) }],
    }));
    const s = { ...newState(0), realm: 9, chest };
    const out = fuseAllIn(s);
    // Twenty-seven found pieces make nine, not three and not one.
    expect(out.state.chest).toHaveLength(9);
    expect(out.made).toHaveLength(9);
    expect(out.state.chest.every((x) => x.rarity === 'heaven' && x.from === FUSED)).toBe(true);
    // A second press finds nothing to do.
    expect(fuseAllIn(out.state).made).toHaveLength(0);
  });

  it('keeps every fused Heaven piece inside what validate() allows', () => {
    const tpl = TEMPLATE_BY_KEY.crescent9;
    const three = [0, 1, 2].map((i): Item => ({
      ...mk('crescent9', 'heaven', i), from: 'rat',
      rolls: [{ affix: tpl.affix, value: baseValue(tpl, 'heaven', tpl.affix) * 1.35 }],
    }));
    const made = fuse(three, 'crescent9', 'heaven', 5).made!;
    const v = validate({ ...newState(0), realm: 9, chest: [made] }, 0);
    expect(v.chest[0].rolls[0].value).toBe(made.rolls[0].value);
    expect(v.chest[0].from).toBe(FUSED);
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
      chest = addToChest(chest, drop).chest;
    }
    expect(chest.length).toBe(CHEST_LIMIT);
    for (const it of chest) expect(TEMPLATE_BY_KEY[it.template]).toBeDefined();

    const ranks = RARITIES.map((r) => `${RARITY_INFO[r].han} ${chest.filter((x) => x.rarity === r).length}`);
    console.log(`\n  ${kills} kills filled a ${CHEST_LIMIT}-slot chest: ${ranks.join(' · ')}\n`);
  });
});

/**
 * 換 A swap can leave the chest over a limit that just fell, and a reload must not punish
 * it.
 *
 * `equip` never raises the count, but taking off a piece with a 藏 line lowers the limit
 * under a full chest. 氣查 the audit found the result on a real run: the active
 * cultivator's finished climb held 62 pieces and came back holding 59, and the three it
 * lost were the newest, because the loop kept the first of the list.
 */
describe('換 a chest over a limit that just fell', () => {
  const T0 = 1_700_000_000;
  const mantle = GEAR.find((g) => g.slot === 'robe' && g.affix === 'capacity' && g.realm === 9)!;
  const robe = GEAR.find((g) => g.slot === 'robe' && g.affix !== 'capacity' && g.realm === 9)!;
  const roomy: Item = { id: 'roomy', template: mantle.key, rarity: 'heaven',
    rolls: [{ affix: 'capacity', value: 120 }] };

  it('keeps every piece after the 藏 piece comes off', () => {
    // 承 The robe's place is refined, so the mantle's 藏 line counts twenty levels' worth.
    const base = { ...newState(T0), realm: 9, refined: { robe: 20 } };
    const worn = { robe: roomy };
    const filler = Array.from({ length: CHEST_LIMIT + 5 }, (_, i) => mk(robe.key, 'common', i));
    const before = validate({ ...base, worn, chest: filler }, T0 + 60);
    expect(before.chest.length).toBe(filler.length);

    // 換 Put a plain robe on. The count stays, the limit falls under it.
    const swapped = equip(before.worn, before.chest, before.chest[0], 'robe');
    expect(swapped.chest.length).toBe(filler.length);
    const back = validate({ ...before, worn: swapped.worn, chest: swapped.chest }, T0 + 60);
    expect(back.chest.length).toBe(filler.length);
    expect(back.chest.some((x) => x.id === 'roomy')).toBe(true);
  });

  it('still bounds a forged chest, and throws the worst away rather than the newest', () => {
    const base = { ...newState(T0), realm: 9 };
    const junk = Array.from({ length: 500 }, (_, i) => mk(robe.key, 'common', i));
    const best = mk(robe.key, 'heaven', 999);
    const back = validate({ ...base, chest: [...junk, best] }, T0 + 60);
    expect(back.chest.length).toBe(CHEST_LIMIT);
    expect(back.chest.some((x) => x.id === best.id)).toBe(true);
  });
});

/**
 * 承 The levels belong to the place on the body (State.refined), so a swap is only a swap:
 * neither piece is changed on the way. The rest of the rule is in refined.test.ts.
 */
describe('承 a swap changes neither piece', () => {
  const at = (id: string, template: string): Item =>
    ({ id, template, rarity: 'mystic', rolls: [{ affix: 'power', value: 10 }] });

  it('puts the very piece on and the very old one back in the chest', () => {
    const old = at('old', 'sword3');
    const fresh = at('new', 'sword6');
    const after = equip({ weapon: old }, [fresh], fresh, 'weapon');
    expect(after.worn.weapon).toBe(fresh);
    expect(after.chest).toEqual([old]);
    expect(after.chest[0]).toBe(old);
  });
});

describe('套 a full chest of locks', () => {
  const lock = (id: string, rarity: Item['rarity']): Item => ({ ...mk('sword1', rarity, 0), id, locked: true });
  it('spends a loadout-held spare piece last, and only for a better one', () => {
    const chest = [lock('a', 'common'), lock('b', 'spirit'), lock('c', 'mystic')];
    const spare = () => new Set(['b', 'c']);
    const up = { ...mk('sword1', 'heaven', 9), id: 'n' };
    expect(addToChest(chest, up, 3, () => false, spare).dropped?.id).toBe('b');
    // Not named by a loadout, so nothing is spent: the new piece falls.
    expect(addToChest(chest, up, 3).dropped?.id).toBe('n');
    // Pieces that count as kept ('a') are never touched, however good the drop.
    expect(addToChest(chest, up, 3, () => false, () => new Set()).dropped?.id).toBe('n');
  });
});
