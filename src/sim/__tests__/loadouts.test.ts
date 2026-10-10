import { describe, expect, it } from 'vitest';
import { type Item } from '../../data/gear.ts';
import { addToChest, fusable, fuse } from '../chest.ts';
import { salvage, salvageUpTo, salvageable } from '../salvage.ts';
import { clearSet, isWorn, renameSet, saveSet, setKeeping, setLocked, wearSet } from '../sets.ts';
import { CHEST_LIMIT, SET_ROOM_RESERVE } from '../balance.ts';
import { stash } from '../stash.ts';
import { SET_LIMIT, newState, validate, type State } from '../state.ts';

const T0 = 1_700_000_000;
const piece = (id: string, template = 'sword2', rarity: Item['rarity'] = 'common'): Item =>
  ({ id, template, rarity, rolls: [{ affix: 'power', value: 5 }] });
const at = (over: Partial<State> = {}): State => ({ ...newState(T0), realm: 3, layer: 2, ...over });

/**
 * 鎖 套 rekaris, on the Discord: favourite pieces that nothing destroys, and sets put on
 * with one button. Nothing here changes a number: these hold that a lock is obeyed by
 * every path that melts or fuses, and that a set wears exactly what it saved.
 */
describe('鎖 a locked piece', () => {
  it('is never melted, one at a time or all up to a rank', () => {
    const s = setLocked(at({ chest: [piece('a'), piece('b')] }), 'a', true);
    expect(salvage(s, ['a']).chest.map((x) => x.id)).toEqual(['a', 'b']);
    expect(salvageUpTo(s, 'heaven').chest.map((x) => x.id)).toEqual(['a']);
    expect(salvageable(s.chest, 'heaven').map((x) => x.id)).toEqual(['b']);
  });

  it('is never the one a full chest throws out, and if all are locked the new piece goes', () => {
    const chest = [{ ...piece('weak'), locked: true as const }, piece('mid', 'sword3')];
    const kept = addToChest(chest, piece('new', 'sword4'), 2);
    expect(kept.dropped?.id).toBe('mid');
    const all = [{ ...piece('x'), locked: true as const }, { ...piece('y'), locked: true as const }];
    const full = addToChest(all, piece('z', 'sword9', 'heaven'), 2);
    expect(full.dropped?.id).toBe('z');
    expect(full.chest.map((x) => x.id)).toEqual(['x', 'y']);
  });

  it('stays in the chest when it is named in a melt beside other pieces', () => {
    const s = setLocked(at({ chest: [piece('a'), piece('b')] }), 'a', true);
    const out = salvage(s, ['a', 'b']);
    expect(out.chest.map((x) => x.id)).toEqual(['a']);
    expect(out.qi).toBe(salvage(at({ chest: [piece('b')] }), ['b']).qi);
  });

  it('is the last a chest gives up when a save arrives over its limit', () => {
    const many = Array.from({ length: 120 }, (_, i) => (i % 2
      ? { ...piece(`l${i}`), locked: true as const } : piece(`h${i}`, 'sword9', 'heaven')));
    const kept = validate({ ...at(), chest: many }, T0).chest;
    expect(kept.length).toBeLessThan(many.length);
    expect(kept.every((x) => x.locked)).toBe(true);
  });

  it('is never one of three in a fusion', () => {
    const chest = [{ ...piece('a'), locked: true as const }, piece('b'), piece('c')];
    expect(fusable(chest)).toEqual([]);
    expect(fuse(chest, 'sword2', 'common').made).toBeNull();
  });

  it('survives a save, and only a true lock is a lock', () => {
    const s = setLocked(at({ chest: [piece('a'), piece('b')] }), 'a', true);
    const back = validate(JSON.parse(JSON.stringify(s)), T0);
    expect(back.chest.find((x) => x.id === 'a')?.locked).toBe(true);
    const forged = validate({ ...JSON.parse(JSON.stringify(s)), chest: [{ ...piece('q'), locked: 'yes' }] }, T0);
    expect(forged.chest[0].locked).toBeUndefined();
  });

  it('unlocks', () => {
    const s = setLocked(setLocked(at({ chest: [piece('a')] }), 'a', true), 'a', false);
    expect('locked' in s.chest[0]).toBe(false);
  });
});

describe('套 a saved set', () => {
  const body = () => at({
    worn: { weapon: piece('w1'), robe: piece('r1', 'robe2') },
    chest: [piece('w2', 'sword3'), piece('r2', 'robe3')],
  });

  it('remembers what is worn, locks it, and puts it back on', () => {
    let s = saveSet(body(), 0, 'Sword');
    expect(s.sets).toEqual([{ name: 'Sword', ids: { weapon: 'w1', robe: 'r1' } }]);
    expect(s.worn.weapon?.locked).toBe(true);
    // Change into the other pieces by hand, then put the set back on.
    s = wearSet({ ...s, sets: [...s.sets, { name: 'Other', ids: { weapon: 'w2', robe: 'r2' } }] }, 1).state;
    expect([s.worn.weapon?.id, s.worn.robe?.id]).toEqual(['w2', 'r2']);
    expect(isWorn(s, 1)).toBe(true);
    const back = wearSet(s, 0);
    expect([back.state.worn.weapon?.id, back.state.worn.robe?.id]).toEqual(['w1', 'r1']);
    expect(back.missing).toBe(0);
    expect(back.state.chest.length + Object.keys(back.state.worn).length).toBe(4);
  });

  it('says how many of its pieces are gone, and wears the rest', () => {
    const s = { ...body(), sets: [{ name: 'Other', ids: { weapon: 'w2', robe: 'nowhere' } }] };
    const r = wearSet(s, 0);
    expect(r.missing).toBe(1);
    expect(r.state.worn.weapon?.id).toBe('w2');
    expect(r.state.worn.robe?.id).toBe('r1');
  });

  it('keeps at most SET_LIMIT, in order, and forgets one when asked', () => {
    let s = body();
    for (let i = 0; i < SET_LIMIT + 2; i++) s = saveSet(s, i, `S${i}`);
    expect(s.sets).toHaveLength(SET_LIMIT);
    expect(clearSet(s, 0).sets.map((x) => x.name)).toEqual(Array.from({ length: SET_LIMIT - 1 }, (_, i) => `S${i + 1}`));
  });

  it('is validated as input: names short and clean, ids real strings, no more than the limit', () => {
    const raw = { ...JSON.parse(JSON.stringify(body())), sets: [
      { name: 'x'.repeat(200), ids: { weapon: 'w1', robe: 5 } },
      { name: '', ids: { weapon: 'w1' } },
      { name: 'ok', ids: {} },
      { name: 'a', ids: { weapon: 'w1' } }, { name: 'b', ids: { weapon: 'w1' } }, { name: 'c', ids: { weapon: 'w1' } },
    ] };
    const v = validate(raw, T0);
    expect(v.sets.length).toBeLessThanOrEqual(SET_LIMIT);
    expect(v.sets[0]).toEqual({ name: 'x'.repeat(24), ids: { weapon: 'w1' } });
    expect(validate({ ...raw, sets: 'nope' }, T0).sets).toEqual([]);
  });

  /** 名 rekaris: "being able to rename the loadout would be a nice addition." */
  it('takes a new name and keeps its pieces, and an empty name keeps the old one', () => {
    const s = saveSet(body(), 0, 'Sword Cultivator');
    const named = renameSet(s, 0, '  Boss  killer\u0007 ');
    expect(named.sets[0].name).toBe('Boss  killer');
    expect(named.sets[0].ids).toEqual(s.sets[0].ids);
    expect(renameSet(s, 0, '   ').sets[0].name).toBe('Sword Cultivator');
    expect(renameSet(s, 0, 'x'.repeat(60)).sets[0].name).toHaveLength(24);
    expect(renameSet(s, 5, 'nobody')).toBe(s);
    expect(validate(JSON.parse(JSON.stringify(named)), T0).sets[0].name).toBe('Boss  killer');
  });

  it('a save from before sets existed loads with none', () => {
    const { sets: _none, ...old } = JSON.parse(JSON.stringify(body()));
    expect(validate(old, T0).sets).toEqual([]);
  });
});

/** 套 Ten loadouts, and the rule that keeps them from locking the chest solid. */
describe('套 ten loadouts', () => {
  const rawSets = (n: number) => Array.from({ length: n }, (_, i) => ({ name: `S${i}`, ids: { weapon: `w${i}`, robe: `r${i}` } }));
  const asSave = (n: number) => ({ ...JSON.parse(JSON.stringify(at())), sets: rawSets(n) });

  it('keeps ten, and the number lives in balance.ts', () => {
    expect(SET_LIMIT).toBe(10);
  });

  it('loads a save of five sets unchanged, and trims a forged fifty to ten', () => {
    const five = validate(asSave(5), T0);
    expect(five.sets).toEqual(rawSets(5));
    const forged = validate(asSave(50), T0);
    expect(forged.sets).toHaveLength(10);
    expect(forged.sets.map((x) => x.name)).toEqual(rawSets(10).map((x) => x.name));
    // A task given to a set that was trimmed away is dropped with it.
    const task = validate({ ...asSave(50), tasks: { fuse: 3, melt: 40 } }, T0);
    expect(task.tasks).toEqual({ fuse: 3 });
  });

  it('saves a tenth set and no eleventh', () => {
    let s = at({ worn: { weapon: piece('w1'), robe: piece('r1', 'robe2') } });
    for (let i = 0; i < 12; i++) s = saveSet(s, i, `S${i}`);
    expect(s.sets).toHaveLength(10);
  });

  /** A chest of pieces, each set naming `per` of them: every one locked by its set. */
  const crowded = (sets: number, per: number, extra = 0): State => {
    const chest: Item[] = [];
    const named: { name: string; ids: Record<string, string> }[] = [];
    const slots = ['weapon', 'robe', 'crown', 'boots', 'talisman', 'ring'];
    for (let k = 0; k < sets; k++) {
      const ids: Record<string, string> = {};
      for (let j = 0; j < per; j++) {
        const id = `k${k}-${j}`;
        chest.push({ ...piece(id), locked: true });
        ids[slots[j]] = id;
      }
      named.push({ name: `S${k}`, ids });
    }
    for (let i = 0; i < extra; i++) chest.push(piece(`loose${i}`));
    return at({ chest, sets: named as State['sets'] });
  };

  it('counts the pieces loadouts keep in the chest, and not what is worn', () => {
    const s = crowded(3, 4);
    expect(setKeeping(s, CHEST_LIMIT)).toMatchObject({ named: 12, counted: 12 });
    expect(setKeeping(s, CHEST_LIMIT).spare.size).toBe(0);
    // A piece worn costs no place; a piece two loadouts name counts once.
    const shared = { ...s, sets: [...s.sets, { name: 'Twin', ids: { weapon: 'k0-0' } }] };
    expect(setKeeping(shared, CHEST_LIMIT).named).toBe(12);
    expect(setKeeping({ ...s, chest: s.chest.slice(0, 5) }, CHEST_LIMIT).named).toBe(5);
    expect(setKeeping({ sets: [], chest: [] }, CHEST_LIMIT)).toMatchObject({ named: 0, counted: 0 });
  });

  it('never counts more than the chest less its reserve, the oldest loadout going first', () => {
    const s = crowded(10, 6);                                   // 60 locked pieces for 40 places
    const keep = setKeeping(s, CHEST_LIMIT);
    expect(keep.named).toBe(60);
    expect(keep.counted).toBe(CHEST_LIMIT - SET_ROOM_RESERVE);
    expect(keep.counted + keep.spare.size).toBe(60);
    // The newest loadout is counted whole, the oldest is the one left over.
    expect([...keep.spare].some((id) => id.startsWith('k9-'))).toBe(false);
    expect([...keep.spare].every((id) => Number(id.slice(1, id.indexOf('-'))) <= 4)).toBe(true);
    expect(keep.spare.has('k0-0')).toBe(true);
    // Nothing was deleted or unlocked by asking.
    expect(s.chest).toHaveLength(60);
    expect(s.chest.every((x) => x.locked)).toBe(true);
    // A bigger chest counts more, a smaller one less, and never below nothing.
    expect(setKeeping(s, CHEST_LIMIT + 20).counted).toBe(CHEST_LIMIT + 20 - SET_ROOM_RESERVE);
    expect(setKeeping(s, 3).counted).toBe(0);
  });

  it('is pure: the same save asked twice answers alike, and the save is not touched', () => {
    const s = crowded(10, 6);
    const before = JSON.stringify(s);
    expect([...setKeeping(s, 40).spare]).toEqual([...setKeeping(s, 40).spare]);
    expect(JSON.stringify(s)).toBe(before);
  });

  it('leaves somewhere for a drop when the loadouts fill the whole chest', () => {
    const s = crowded(10, 4);                                   // exactly 40 locked pieces
    const spare = () => setKeeping(s, CHEST_LIMIT).spare;
    expect(s.chest).toHaveLength(CHEST_LIMIT);
    // Without the rule the new piece would fall; with it a better one takes the worst spare place.
    const better = addToChest(s.chest, piece('new', 'sword9', 'heaven'), CHEST_LIMIT, () => false, spare);
    expect(better.dropped).not.toBeNull();
    expect(better.dropped!.id).not.toBe('new');
    expect(better.chest.map((x) => x.id)).toContain('new');
    expect(better.chest).toHaveLength(CHEST_LIMIT);
    // A worse piece than the worst spare one still falls: nothing better is ever thrown out for it.
    const worse = addToChest(s.chest, { ...piece('dust'), rarity: 'common', template: 'sword1' }, CHEST_LIMIT, () => false, spare);
    expect(worse.chest.map((x) => x.id)).not.toContain('dust');
    // The counted pieces were never the ones to go.
    expect(spare().has(better.dropped!.id)).toBe(true);
  });

  it('spares every piece first: an unlocked one always goes before a spare locked one', () => {
    const s = crowded(10, 4);
    const chest = [...s.chest.slice(0, 39), piece('junk')];
    const out = addToChest(chest, piece('new', 'sword9', 'heaven'), CHEST_LIMIT, () => false,
      () => setKeeping({ sets: s.sets, chest }, CHEST_LIMIT).spare);
    expect(out.dropped?.id).toBe('junk');
  });

  it('without the rule a chest of locks turns the drop away, as it always did', () => {
    const s = crowded(10, 4);
    const out = addToChest(s.chest, piece('new', 'sword9', 'heaven'), CHEST_LIMIT);
    expect(out.dropped?.id).toBe('new');
    expect(out.chest).toBe(s.chest);
  });

  it('stash() uses the rule, and the set that lost a spare piece says so when worn', () => {
    const s = crowded(10, 4);
    const out = stash(s, piece('new', 'sword9', 'heaven'), false);
    expect(out.state.chest.map((x) => x.id)).toContain('new');
    expect(out.dropped).not.toBeNull();
    const gone = out.dropped!.id;
    const index = out.state.sets.findIndex((x) => Object.values(x.ids).includes(gone));
    expect(wearSet(out.state, index).missing).toBeGreaterThan(0);
    // A chest with room is untouched by any of this.
    expect(stash(crowded(2, 4), piece('new'), false).dropped).toBeNull();
  });
});
