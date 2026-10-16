import { describe, expect, it } from 'vitest';
import { renderToStaticMarkup } from 'react-dom/server';
import { createElement } from 'react';
import { Breakthrough, bloomHolds } from '../ui/Breakthrough.tsx';
import { opensIn } from '../../sim/unlocks.ts';
import { newState } from '../../sim/state.ts';
import { XP_TABLE } from '../../data/crafts.ts';
import { CRAFT_FEED_LEVEL, LINEAGE_LAYER } from '../../sim/balance.ts';
import { HOLD, LADDER, standing } from '../copy.ts';

const card = (realm: number, state = { ...newState(0), realm }) => renderToStaticMarkup(createElement(Breakthrough, {
  realm, state, onGo: () => {}, onDone: () => {},
}));

/**
 * 突破 The breakthrough card, held to what the realm brings (the release audit, 2026-10-16).
 */
describe('突破 the breakthrough card says what the realm brings', () => {
  it('waits to be read at every realm from the second, the eighth included', () => {
    // 來 The eighth opens no system and went by in 1.4 seconds.
    expect(opensIn(8)).toHaveLength(0);
    for (let r = 2; r <= 9; r++) expect(bloomHolds(r), `realm ${r}`).toBe(true);
    const eighth = card(8);
    expect(eighth).toContain('Coming in this realm');
    expect(eighth).toContain('stands at the end');
    expect(eighth).toContain('Go on');
  });

  it('names the realm gear and the layer it starts dropping, from the second realm', () => {
    for (let r = 2; r <= 9; r++) {
      expect(card(r), `realm ${r}`).toContain(`starts dropping at layer ${standing(LINEAGE_LAYER)}`);
    }
    expect(card(2)).toContain('from the first kill');
  });

  it('marks a craft its feeder opened early as already yours, and a new one as new', () => {
    // 丹 Alchemy opens with the fifth realm, or with Herb Gathering at CRAFT_FEED_LEVEL.
    const fresh = card(5);
    expect(fresh).toContain('Alchemy');
    expect(fresh).not.toContain('Yours already');
    const s = newState(0);
    const fed = { ...s, realm: 5, crafts: { ...s.crafts, xp: { ...s.crafts.xp, herb: XP_TABLE[CRAFT_FEED_LEVEL] } } };
    expect(card(5, fed)).toContain(`Yours already, since Herb Gathering reached level ${CRAFT_FEED_LEVEL}.`);
  });
});

describe('頂 the ladder at the ninth realm', () => {
  it('does not promise a next realm, and names the Dragon', () => {
    for (const rule of [LADDER.ruleSummit, HOLD.ruleSummit]) {
      expect(rule('渡劫', 'Tribulation')).toContain('the Dragon (龍)');
      expect(rule('渡劫', 'Tribulation')).not.toContain('warden');
    }
    expect(LADDER.ruleAfterSummit).not.toMatch(/next realm/);
    expect(LADDER.ruleAfterSummit).toContain('summit');
  });
});
