import { describe, expect, it } from 'vitest';
import { CLASS, GEAR, HELP, ITEM, SIT } from '../copy.ts';
import { MELT_CAP, MELT_FILL, QI_FULL_ROOF, QI_ROOF_FIRST } from '../../sim/balance.ts';
import { GEAR as TEMPLATES } from '../../data/gear.ts';
import { salvageValue } from '../../sim/salvage.ts';
import { FILTER_LIMIT } from '../../sim/filters.ts';
import { PILL_LINES } from '../../data/alchemy.ts';
import { ITEMS } from '../../data/crafts.ts';
import { pillBane } from '../../sim/furnace.ts';
import { PILL_BANE_FLOOR } from '../../sim/balance.ts';

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

  it('says how much the melting allowance holds, and that lower-realm gear melts for less (rekaris, 2026-10-07)', () => {
    const text = GEAR.allowance('1.2M');
    expect(text).toContain(`at most ${MELT_CAP / 3600} hours`);
    expect(text).toContain('lower-realm gear melts for less');
    // And it is true: a piece of the first realm pays less than the same piece of the fifth.
    const piece = (realm: number) => ({ id: 'x', template: TEMPLATES.find((g) => g.realm === realm && g.slot === 'weapon')!.key, rarity: 'common' as const, rolls: [] });
    expect(salvageValue(piece(1))).toBeLessThan(salvageValue(piece(5)));
  });

  it('says that time off the screen never deepens the sitting (rekaris, 2026-10-07)', () => {
    expect(HELP.steps[1][1]).toContain('Time off the screen');
    expect(HELP.steps[1][1]).toContain('never deepens');
    expect(SIT.rising).toContain('never deepens');
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

  it('says what the first Bane pill really takes off, not the rate it decays at', () => {
    const first = 1 - pillBane({ body: 0, bane: 1, fortune: 0 } as never);
    const said = PILL_LINES.bane.effect;
    expect(said).toContain(`${+(first * 100).toFixed(1)}%`);
    expect(said).toContain(`${+(PILL_BANE_FLOOR * 100).toFixed(1)}%`);
    expect(said).toContain('never the Dragon');
  });

  it('tells every elixir and sigil that the tribulation’s Dragon is out of its reach', () => {
    const made = Object.values(ITEMS).filter((i) => (i.kind === 'elixir' || i.kind === 'sigil') && i.does?.includes('hard fight'));
    expect(made.length).toBeGreaterThan(20);
    for (const i of made) expect(i.does ?? '', i.key).toContain('Dragon');
  });
});
