import { describe, expect, it } from 'vitest';
import { CLASS, GEAR, ITEM } from '../copy.ts';
import { MELT_FILL, QI_FULL_ROOF, QI_ROOF_FIRST } from '../../sim/balance.ts';
import { FILTER_LIMIT } from '../../sim/filters.ts';

/**
 * 便 What the testers asked for on 2026-10-06 that was only a sentence or a constant: the
 * sentences say what the code does, so the numbers in them are read from the code.
 */
describe('便 the small fixes the Discord asked for', () => {
  it('says what the Qi school lifts, as a plain amount, with the ceiling it lifts', () => {
    const text = CLASS.school.qi(0.05, 0.1, QI_FULL_ROOF);
    expect(text).toContain(`stands ${QI_FULL_ROOF} higher`);
    expect(text).toContain(`×${QI_ROOF_FIRST} becomes ×${Math.round((QI_ROOF_FIRST + QI_FULL_ROOF) * 100) / 100}`);
    // It was "×0.1 higher", which read as a tenth of the ceiling and not as an addition to it.
    expect(text).not.toContain(`×${QI_FULL_ROOF} higher`);
    expect(CLASS.schoolAt.qi(0.05, QI_FULL_ROOF)).not.toContain(`×${QI_FULL_ROOF}`);
  });

  it('says how fast the melting allowance refills, from the constant that refills it', () => {
    const text = GEAR.allowance('1.2M');
    expect(text).toContain(`${Math.round(MELT_FILL * 1000) / 10}%`);
    expect(text).toContain('sitting does not speed it up');
  });

  it('says which fights the beasts-weaker line reaches, and the two it never does', () => {
    const text = ITEM.axisSays.sunder;
    for (const place of ['hunt', 'tower', 'Platform', 'warden']) expect(text).toContain(place);
    expect(text).toContain('heart demon');
    expect(text).toContain('Dragon');
  });

  it('keeps room for a long row of saved filters', () => {
    expect(FILTER_LIMIT).toBe(24);
  });
});
