import { describe, expect, it } from 'vitest';
import { LAYERS_PER_REALM } from '../balance.ts';
import { STANCE_LAYER } from '../../data/arts.ts';
import { LINEAGE_LAYER, droppableIn, realmSet } from '../../data/gear.ts';
import { commonsOf, wardenOf } from '../../data/bestiary.ts';
import { arriving } from '../arriving.ts';
import { stanceChoices, validateStance } from '../arts.ts';
import { rollDrop } from '../drops.ts';

/**
 * 層 A realm hands itself over across its layers, not all in its first minute.
 *
 * 隙 Measured before this: a realm gave its name, its first common, the warden's art,
 * its stance and a whole lineage of gear at the breakthrough, and then ran for twelve
 * days on one beast every five. The longest stretch with nothing arriving at all was
 * 6.5 days; spread, it is 4.5.
 */
describe('層 a realm arrives in pieces', () => {
  it('owes its stance, its lineage, its commons and its warden at the foot of it', () => {
    const owed = arriving(8, 0);
    expect(owed.map((a) => a.kind)).toContain('stance');
    expect(owed.map((a) => a.kind)).toContain('gear');
    expect(owed.filter((a) => a.kind === 'beast').length).toBeGreaterThan(0);
    expect(owed[owed.length - 1].kind).toBe('warden');
    // 序 In the order they arrive, which is what the card is for.
    expect(owed.map((a) => a.layer)).toEqual([...owed.map((a) => a.layer)].sort((x, y) => x - y));
  });

  it('owes nothing once the warden is reached', () => {
    expect(arriving(8, LAYERS_PER_REALM - 1)).toEqual([]);
  });

  it('never owes a first realm a stance or a lineage, because neither is open there', () => {
    const owed = arriving(1, 0);
    expect(owed.map((a) => a.kind)).not.toContain('stance');
    expect(owed.map((a) => a.kind)).not.toContain('gear');
  });

  it('names the realm own warden and its own commons', () => {
    const owed = arriving(5, 0);
    expect(owed.find((a) => a.kind === 'warden')?.key).toBe(wardenOf(5).key);
    const beasts = owed.filter((a) => a.kind === 'beast').map((a) => a.key);
    for (const k of beasts) expect(commonsOf(5).map((b) => b.key)).toContain(k);
  });
});

describe('勢 the stance walks out part way up its realm', () => {
  it('is not standable before its layer and is after', () => {
    const before = stanceChoices(7, STANCE_LAYER - 1).map((s) => s.key);
    const after = stanceChoices(7, STANCE_LAYER).map((s) => s.key);
    expect(before).not.toContain('reckless');
    expect(after).toContain('reckless');
  });

  it('keeps every stance of every realm below, at any layer', () => {
    // 取 Nothing is taken away by the gate: what moves is when the new one arrives.
    const held = stanceChoices(7, 0).map((s) => s.key);
    expect(held).toContain('steady');   // the sixth realm's
    expect(held).toHaveLength(6);
  });

  it('is cleaned out of a save that claims it too early', () => {
    expect(validateStance('reckless', 7, 0)).toBeNull();
    expect(validateStance('reckless', 7, STANCE_LAYER)).toBe('reckless');
    expect(validateStance('reckless', 8, 0)).toBe('reckless');
  });
});

describe('器 the newest lineage starts dropping part way up', () => {
  it('is out of the pool before its layer and in it after', () => {
    const before = droppableIn(8, LINEAGE_LAYER - 1).map((g) => g.realm);
    const after = droppableIn(8, LINEAGE_LAYER).map((g) => g.realm);
    expect(before).not.toContain(8);
    expect(after).toContain(8);
    expect(new Set(before)).toEqual(new Set([1, 2, 3, 4, 5, 6, 7]));
  });

  it('never holds back a lineage below the one being climbed', () => {
    const pool = droppableIn(9, 0);
    expect(new Set(pool.map((g) => g.realm))).toEqual(new Set([1, 2, 3, 4, 5, 6, 7, 8]));
  });

  it('lets an old beast drop its own realm, whatever layer you stand on', () => {
    // 舊 The gate is about the realm you are climbing, not about every beast in it.
    const old = commonsOf(4)[0];
    const seen = new Set<number>();
    for (let i = 0; i < 400; i++) {
      const item = rollDrop(old, 9, i, {}, 0);
      if (item) seen.add(Number(item.template.match(/\d+$/)?.[0] ?? 0));
    }
    expect(seen.size).toBeGreaterThan(0);
  });

  it('names a lineage the realm card can show', () => {
    expect(realmSet(8).han).toBe('龍骸');
  });
});
