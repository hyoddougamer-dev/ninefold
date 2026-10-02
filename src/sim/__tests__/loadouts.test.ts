import { describe, expect, it } from 'vitest';
import { type Item } from '../../data/gear.ts';
import { addToChest, fusable, fuse } from '../chest.ts';
import { salvage, salvageUpTo, salvageable } from '../salvage.ts';
import { clearSet, isWorn, renameSet, saveSet, setLocked, wearSet } from '../sets.ts';
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
    expect(clearSet(s, 0).sets.map((x) => x.name)).toEqual(['S1', 'S2']);
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
