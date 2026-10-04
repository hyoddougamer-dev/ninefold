import { describe, expect, it } from 'vitest';
import { SLOTS, type Item, type Rarity } from '../../data/gear.ts';
import { addToChest, equip, fusable, fuse, removeFromChest, unequip } from '../chest.ts';
import { fuseAllIn, fuseIn } from '../stash.ts';
import { salvage, salvageUpTo, salvageable } from '../salvage.ts';
import { linesHeld, marksUp, swing, verdictByLines, verdictOf, compare, wearBetter } from '../inspect.ts';
import { loadoutsOf, saveSet, setLocked } from '../sets.ts';
import { newState, validate, type State } from '../state.ts';

/**
 * 守 What the testers lost, and the rules that keep it now (the Discord, 2026-10-04).
 *
 *   承 Refining levels went with a piece taken off, and the bulk melt or a fusion then
 *      took the piece. Two fused pieces could share a name, and wearing one melted the
 *      other. Neither may happen without the player choosing it on the piece's own sheet.
 *   套 A loadout's piece could be unlocked and melted.
 *   ▲  An upgrade could give up a line the worn piece had.
 */
const T0 = 1_700_000_000;

const piece = (id: string, template: string, rarity: Rarity,
  rolls: { affix: string; value: number }[], extra: Partial<Item> = {}): Item =>
  ({ id, template, rarity, rolls: rolls as Item['rolls'], ...extra });

const hero = (over: Partial<State> = {}): State =>
  ({ ...newState(T0), realm: 6, layer: 4, at: T0, startedAt: T0 - 60 * 86_400, ...over } as State);

/** Every refining level the cultivator holds, worn or in the chest. */
const levels = (s: Pick<State, 'worn' | 'chest'>) =>
  [...SLOTS.map((k) => s.worn[k]).filter(Boolean), ...s.chest]
    .reduce((n, x) => n + Math.floor(x!.refine ?? 0), 0);

describe('承 refining levels are never lost without the player choosing it', () => {
  const sword = (id: string, value: number, extra: Partial<Item> = {}) =>
    piece(id, 'sword5', 'common', [{ affix: 'power', value }], extra);

  it('a piece taken off keeps its levels, and no bulk melt, fusion or full chest takes it', () => {
    const W = sword('w', 8, { refine: 10 });
    const N = sword('n', 11);
    let s = hero({ worn: { weapon: W }, chest: [N, sword('c1', 4), sword('c2', 4)] });
    const off = unequip(s.worn, s.chest, 'weapon');
    s = { ...s, worn: off.worn, chest: [...off.chest] };
    // Another sword goes into the empty place by hand, and it starts at nothing.
    const on = equip(s.worn, s.chest, N, 'weapon');
    s = { ...s, worn: on.worn, chest: [...on.chest] };
    expect(s.worn.weapon?.id).toBe('n');
    expect(s.chest.find((x) => x.id === 'w')?.refine).toBe(10);
    expect(levels(s)).toBe(10);

    // 拆 The bulk melt reaches every common, and leaves the refined one.
    expect(salvageable(s.chest, 'heaven').map((x) => x.id)).not.toContain('w');
    const melted = salvageUpTo(s, 'heaven');
    expect(melted.chest.map((x) => x.id)).toEqual(['w']);
    expect(levels(melted)).toBe(10);

    // 煉 Three commons of one shape, one of them refined: not a group, and Fuse all leaves it.
    expect(fusable(s.chest)).toHaveLength(0);
    expect(fuseIn(s, 'sword5', 'common').made).toBeNull();
    expect(fuseAllIn(s).state).toBe(s);

    // 藏 A full chest drops the new piece rather than the refined one, even when it is worse.
    const full = addToChest([sword('r', 1, { refine: 3 })], sword('x', 9), 1);
    expect(full.dropped?.id).toBe('x');

    // 拆 Melting it from its own sheet is the player's choice, and still works.
    expect(salvage(s, ['w']).chest.some((x) => x.id === 'w')).toBe(false);
  });

  it('the place keeps the higher of the two counts when a piece goes on', () => {
    const W = sword('w', 8, { refine: 10 });
    const C = sword('c', 9, { refine: 4 });
    const on = equip({ weapon: W }, [C], C, 'weapon');
    expect(on.worn.weapon?.id).toBe('c');
    expect(on.worn.weapon?.refine).toBe(10);
    expect(on.chest.map((x) => [x.id, x.refine])).toEqual([['w', 4]]);
  });

  it('two fusions never make one name, and wearing one twin leaves the other', () => {
    const c = (i: string) => sword(i, 4.8);
    const filler = Array.from({ length: 10 }, (_, i) => piece(`f${i}`, 'robe5', 'common', [{ affix: 'rate', value: 2 }]));
    const one = fuse([...filler, c('a1'), c('a2'), c('a3')], 'sword5', 'common', 1.4);
    const rest = one.chest.filter((x) => x !== one.made);
    const two = fuse([...rest, c('b1'), c('b2'), c('b3')], 'sword5', 'common', 1.4);
    // The same shape, the same chest size, the same roll: the old name was the same name.
    expect(one.made!.id).not.toBe(two.made!.id);
    // And it is the same name every time the same three go in: the sim stays pure.
    expect(fuse([...filler, c('a1'), c('a2'), c('a3')], 'sword5', 'common', 1.4).made!.id).toBe(one.made!.id);
    // A name the body already holds is never handed out again.
    const taken = fuse([...filler, c('a1'), c('a2'), c('a3')], 'sword5', 'common', 1.4, [one.made!.id]);
    expect(taken.made!.id).not.toBe(one.made!.id);
  });

  it('equip takes exactly the one piece, even from a chest holding twins', () => {
    const t1 = sword('twin', 9, { refine: 10 });
    const t2 = sword('twin', 9);
    const on = equip({}, [t1, t2], t2, 'weapon');
    expect(on.chest).toEqual([t1]);
    expect(removeFromChest([t1, t2], 'twin')).toEqual([t2]);
  });

  it('a save holding twins keeps both on load, the second renamed', () => {
    const t1 = sword('twin', 9, { refine: 10 });
    const t2 = sword('twin', 9);
    const s = hero({ worn: { weapon: t1 }, chest: [t2, sword('other', 3)] });
    const v = validate(JSON.parse(JSON.stringify(s)), T0);
    expect(v.worn.weapon?.id).toBe('twin');
    expect(v.chest).toHaveLength(2);
    const ids = [v.worn.weapon!.id, ...v.chest.map((x) => x.id)];
    expect(new Set(ids).size).toBe(ids.length);
    expect(v.chest[0].id).not.toBe('twin');
    expect(levels(v)).toBe(levels(s));
  });
});

describe('套 a loadout\'s piece stays locked', () => {
  const ring = piece('r', 'plainring5', 'earth', [{ affix: 'power', value: 20 }]);
  const other = piece('o', 'plainring5', 'earth', [{ affix: 'power', value: 21 }]);

  it('cannot be unlocked while a loadout names it, so the bulk melt can never take it', () => {
    let s = saveSet(hero({ worn: { ring }, chest: [other] }), 0, 'Fight');
    s = { ...s, ...equip(s.worn, s.chest, other, 'ring') } as State;
    expect(s.chest.find((x) => x.id === 'r')?.locked).toBe(true);
    expect(loadoutsOf(s, 'r')).toEqual(['Fight']);
    const asked = setLocked(s, 'r', false);
    expect(asked).toBe(s);
    expect(salvageUpTo(asked, 'heaven').chest.some((x) => x.id === 'r')).toBe(true);
    // Out of the loadout (forgotten), it unlocks as any piece does.
    const free = setLocked({ ...s, sets: [] }, 'r', false);
    expect(free.chest.find((x) => x.id === 'r')?.locked).toBeUndefined();
  });

  it('a save that names an unlocked piece in a loadout loads it locked', () => {
    const s = hero({ chest: [ring], sets: [{ name: 'Fight', ids: { ring: 'r' } }] });
    const v = validate(JSON.parse(JSON.stringify(s)), T0);
    expect(v.chest.find((x) => x.id === 'r')?.locked).toBe(true);
  });
});

describe('▲ a strict upgrade', () => {
  // A ring with power and 運 luck, against one with more power and no luck at all.
  const worn = piece('w', 'plainring5', 'spirit', [{ affix: 'power', value: 8 }, { affix: 'luck', value: 4 }]);
  const louder = piece('p', 'powerring5', 'mystic', [{ affix: 'power', value: 14 }]);
  const strict = piece('s', 'plainring5', 'mystic', [{ affix: 'power', value: 12 }, { affix: 'luck', value: 5 }]);

  it('is never a piece that gives up a line the worn one has', () => {
    const s = hero({ worn: { ring: worn }, chest: [louder, strict] });
    // Power alone calls it better, and it used to be ▲.
    expect(swing(s, louder).better).toBe(true);
    expect(linesHeld(s, louder)).toBe(false);
    expect(marksUp(s, louder)).toBe(false);
    expect(marksUp(s, strict)).toBe(true);
    // The sheet calls the louder ring a trade, not an upgrade.
    expect(verdictByLines(verdictOf(swing(s, louder)), compare(louder, worn))).toBe('trade');
    expect(verdictByLines(verdictOf(swing(s, strict)), compare(strict, worn))).toBe('up');
    // 著 Wear all upgrades puts on the strict one and nothing else.
    const r = wearBetter(s);
    expect(r.worn).toBe(1);
    expect(r.state.worn.ring?.id).toBe('s');
  });

  it('reads the new piece with the levels it would carry', () => {
    // Bare, 3.5 luck is under the worn 4 refined; carried, the place's levels lift it too.
    const refined = { ...worn, refine: 6 };
    const close = piece('c', 'plainring5', 'mystic', [{ affix: 'power', value: 12 }, { affix: 'luck', value: 4 }]);
    const s = hero({ worn: { ring: refined }, chest: [close] });
    expect(linesHeld(s, close)).toBe(true);
  });
});
