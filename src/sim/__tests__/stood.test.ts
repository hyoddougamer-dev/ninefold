import { beforeEach, describe, expect, it } from 'vitest';
import { NO_CRAFTS, settle, setTask, work } from '../crafts.ts';
import { XP_TABLE, type SkillKey } from '../../data/crafts.ts';
import { CRAFT_WORK_HOURS } from '../balance.ts';
import { newState, type State } from '../state.ts';
import { load, save } from '../save.ts';

const T0 = 1_700_000_000;
const HOUR = 3600;

function memoryStorage() {
  const map = new Map<string, string>();
  return {
    getItem: (k: string) => map.get(k) ?? null,
    setItem: (k: string, v: string) => { map.set(k, v); },
    removeItem: (k: string) => { map.delete(k); },
    clear: () => map.clear(),
    key: (i: number) => [...map.keys()][i] ?? null,
    get length() { return map.size; },
  };
}
beforeEach(() => { (globalThis as { localStorage?: unknown }).localStorage = memoryStorage(); });

function crafter(levels: Partial<Record<SkillKey, number>>, pouch: Record<string, number> = {}, s: Partial<State> = {}): State {
  const xp = { ...NO_CRAFTS.xp };
  for (const [k, l] of Object.entries(levels)) xp[k as SkillKey] = XP_TABLE[l as number];
  return {
    ...newState(T0), realm: 3, layer: 4, startedAt: T0 - 30 * 86_400, materials: 1e6, qi: 1e6, ...s,
    crafts: { ...NO_CRAFTS, since: T0, xp, pouch },
  };
}

/**
 * 停 The workshop's report: why it stood still, and since when. It is read off the same
 * loop as the work, so the state it hands back must be exactly what work() hands back.
 */
describe('停 why the workshop stood still', () => {
  it('hands back the very state work() does', () => {
    const s0 = setTask(crafter({ forge: 5 }, { iron: 40 }), 'forge:metal1', T0);
    for (const dt of [10, HOUR, 5 * HOUR, 30 * HOUR]) {
      expect(settle(s0, T0 + dt).state).toEqual(work(s0, T0 + dt));
    }
  });

  it('says it rested after its window, from the end of the window', () => {
    const s0 = setTask(crafter({ vein: 5 }), 'vein:iron', T0);
    const r = settle(s0, T0 + 30 * HOUR);
    expect(r.stood).toBe('limit');
    expect(r.stoodFrom).toBe(T0 + CRAFT_WORK_HOURS * HOUR);
  });

  it('says it waited for what ran out, from the end of the last make', () => {
    const s0 = setTask(crafter({ forge: 5 }, { iron: 4 }), 'forge:metal1', T0);
    const r = settle(s0, T0 + 8 * HOUR);
    expect(r.stood).toBe('needs');
    expect(r.state.crafts.pouch.metal1).toBe(2);
    expect(r.stoodFrom).toBeGreaterThan(T0);
    expect(r.stoodFrom!).toBeLessThan(T0 + HOUR);
  });

  it('says it had no task when it had none', () => {
    const r = settle(crafter({ vein: 5 }), T0 + 8 * HOUR);
    expect(r.stood).toBe('idle');
  });

  it('says nothing while it is still working', () => {
    const s0 = setTask(crafter({ vein: 5 }), 'vein:iron', T0);
    expect(settle(s0, T0 + HOUR).stood).toBeNull();
  });
});

describe('歸 the return card says what the workshop did, even when it made nothing', () => {
  it('reports a night spent waiting for ore, with nothing made', () => {
    const s0 = setTask(crafter({ forge: 5 }), 'forge:metal1', T0);
    save({ ...s0, at: T0 });
    const back = load(T0 + 8 * HOUR);
    expect(back.crafts).not.toBeNull();
    expect(back.crafts!.made).toBe(0);
    expect(back.crafts!.stood).toBe('needs');
    expect(back.crafts!.missing).toBe('iron');
    expect(back.crafts!.still).toBeCloseTo(8 * HOUR, -1);
  });

  it('reports the rest after the window on a long absence', () => {
    const s0 = setTask(crafter({ vein: 5 }), 'vein:iron', T0);
    save({ ...s0, at: T0 });
    const back = load(T0 + 30 * HOUR);
    expect(back.crafts!.made).toBeGreaterThan(0);
    expect(back.crafts!.stood).toBe('limit');
    expect(back.crafts!.still).toBeCloseTo((30 - CRAFT_WORK_HOURS) * HOUR, -1);
    expect(back.crafts!.hours).toBe(CRAFT_WORK_HOURS);
  });

  it('reports a workshop with no task at all', () => {
    save({ ...crafter({ vein: 5 }), at: T0 });
    const back = load(T0 + 8 * HOUR);
    expect(back.crafts!.task).toBeNull();
    expect(back.crafts!.stood).toBe('idle');
  });

  it('says nothing about a workshop the realm has not opened', () => {
    save({ ...crafter({}), realm: 1, at: T0 });
    expect(load(T0 + 8 * HOUR).crafts).toBeNull();
  });
});
