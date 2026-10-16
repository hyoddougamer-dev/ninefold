import { describe, expect, it } from 'vitest';
import { CHRONICLE, CULTIVATE, HELP, HUNT, KEY, RANKS, REBIRTH } from '../copy.ts';
import { markBonus } from '../../sim/state.ts';

/**
 * 轉世 What the rebirth page and the screens around it promise, held to what a rebirth does
 * (the release audit of 2026-10-16). Each line here was true of a first life and stopped
 * being true the day a cultivator was reborn.
 */
describe('轉世 the words around a rebirth', () => {
  it('does not promise the boards keep the best, when the Heaven List lets go of a reborn life', () => {
    const boards = REBIRTH.carries.find(([han]) => han === '榜')!;
    expect(boards[2]).not.toMatch(/boards keep/);
    expect(boards[2]).toContain('Heaven List');
    expect(boards[2]).toContain('Samsara');
  });

  it('says the hunt and the stele begin again with the life', () => {
    expect(REBIRTH.resets).toMatch(/hunt's counts and marks/);
    expect(REBIRTH.resetsAll).toMatch(/hunt's counts and marks/);
    expect(KEY.marksBlurb).toContain('in this life');
    expect(HUNT.record).toContain('in this life');
    expect(`${KEY.marksBlurb} ${HUNT.record}`).not.toMatch(/for ever/);
  });

  it('never says nothing resets, when a rebirth is an offer at the summit', () => {
    expect(HELP.opens).not.toMatch(/nothing ever resets/);
    expect(HELP.opens).toMatch(/nothing resets on its own/);
  });

  it('calls the marks for this life once a rebirth can end it', () => {
    expect(CULTIVATE.ceiling(3, '1.73x')).toContain('for good');
    expect(CULTIVATE.ceiling(3, '1.73x', true)).toContain('for this life');
    expect(CULTIVATE.ceiling(3, '1.73x', true)).not.toContain('for good');
  });

  it('shows the price beside the gift, read off the marks', () => {
    const line = REBIRTH.cost(3, `${markBonus(3).toFixed(2)}x`, '1.075x', 60);
    expect(line).toBe(`Your 3 marks multiply your qi by ${markBonus(3).toFixed(2)}x now. A new life begins in the first realm at 1.075x, and this one has run 60 days.`);
    expect(markBonus(3)).toBeGreaterThan(5);
    expect(REBIRTH.cost(1, '1.73x', '1.05x', 1)).toMatch(/^Your mark multiplies .* run 1 day\.$/);
    expect(REBIRTH.ranked).toMatch(/up to a day/);
  });

  it('tells a reborn cultivator why the week and Samsara wait', () => {
    expect(RANKS.weekReborn).toMatch(/more Dragons than your last one/);
    expect(RANKS.emptyOf.samsara).not.toMatch(/Nobody has been reborn/);
    expect(RANKS.emptySamsaraBefore).not.toMatch(/Nobody has been reborn/);
  });

  it('keeps the lives on the stele, and counts the day of the life being lived', () => {
    expect(CHRONICLE.standingLife(1, 2, 61, 'Qi Condensation'))
      .toBe('Day 1 of life 2 (day 61 since you began), standing in Qi Condensation.');
    expect(CHRONICLE.life(1, 60, 3, '+7.5%')).toBe('Life 1: 60 days, 3 marks crossed, left an Echo of +7.5%');
  });
});
