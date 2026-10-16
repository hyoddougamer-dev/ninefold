import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { ItemSheet } from '../ui/ItemSheet.tsx';
import { GEAR, baseValue, type Item } from '../../data/gear.ts';
import { newState } from '../../sim/state.ts';

/**
 * 主 The lead line is the piece's own, not whichever line the fixed order of the axes puts
 * first. The sheet marked the first row, and power is always the first row, so a Qi piece
 * with a power side line read as leading with power (a tester asked whether power "rolls
 * twice"). And it said it in one bare character, which the 譯 rule does not allow.
 */
describe('主 the item sheet marks the lead line', () => {
  const tpl = GEAR.find((g) => g.affix === 'rate')!;
  const piece: Item = {
    id: 'lead-test', template: tpl.key, rarity: 'mystic',
    rolls: [
      { affix: 'rate', value: baseValue(tpl, 'mystic', 'rate') },
      { affix: 'power', value: 3 },
    ],
  };
  const sheet = (wearing: boolean, worn?: Item) => {
    const s = newState(0);
    const state = worn ? { ...s, worn: { ...s.worn, [tpl.slot]: worn } } : s;
    return renderToStaticMarkup(createElement(ItemSheet, {
      state, item: piece, wearing,
      onWear: () => {}, onTakeOff: () => {}, onSalvage: () => {}, onLock: () => {}, onClose: () => {},
    }));
  };
  const leadRow = (html: string) => {
    const rows = html.split('class="line"').slice(1);
    const marked = rows.filter((r) => r.includes('class="lead"'));
    expect(marked).toHaveLength(1);
    return marked[0];
  };

  it('on the qi line of a Qi piece, not on its power side line', () => {
    const row = leadRow(sheet(false));
    expect(row).toContain('Qi');
    expect(row).not.toContain('>Power<');
    expect(row).toContain('Lead');
  });

  it('also while a piece is worn in the same place, which used to hide it', () => {
    const other: Item = { ...piece, id: 'worn', rolls: [{ affix: 'power', value: 5 }] };
    expect(leadRow(sheet(false, other))).toContain('Lead');
  });

  it('in English first, with the character beside it', () => {
    expect(leadRow(sheet(true))).toMatch(/Lead <span class="cjk">主<\/span>/);
  });
});
