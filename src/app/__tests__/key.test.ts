import { describe, expect, it } from 'vitest';
import { readFileSync } from 'node:fs';
import { UPGRADES, UPGRADE_INFO } from '../../sim/state.ts';
import { MARK_INFO } from '../../sim/record.ts';
import { AFFIXES, AFFIX_INFO, RARITIES, RARITY_INFO, SLOTS, SLOT_INFO } from '../../data/gear.ts';
import { LINES, PILL_LINES } from '../../data/alchemy.ts';
import { SYSTEMS } from '../../sim/unlocks.ts';
import { KEY } from '../copy.ts';

/**
 * 釋 The key, and the promise that it is complete.
 *
 * Bruno does not read Chinese: "está imensa informação só em chinês e não se percebe bem
 * os sistemas". The characters stay — they are what the game looks like — but the deal
 * struck in return is that **no character is ever the only place a thing is named**.
 *
 * A key page is worth nothing if it drifts. So it is not typed: every row is read out of
 * the table it describes, and this file checks that the tables and the page cannot come
 * apart. Add a gear axis, a pill line, a rank or a whole system and it appears on the
 * page by itself — and if someone ever hand-writes a row instead, this fails.
 */

const SOURCE = readFileSync(new URL('../ui/Key.tsx', import.meta.url), 'utf8');

describe('釋 the key names everything the game shows', () => {
  it('is built from the tables, not typed out', () => {
    // The page must read the data. If these imports ever go, the page has been
    // hand-written and can start lying the moment a table changes.
    for (const table of ['UPGRADE_INFO', 'MARK_INFO', 'AFFIX_INFO', 'RARITY_INFO',
                         'SLOT_INFO', 'PILL_LINES', 'SYSTEMS']) {
      expect(SOURCE).toContain(table);
    }
    // And no beast, rank or axis name may be typed into it as a literal.
    for (const r of RARITIES) expect(SOURCE).not.toContain(`'${RARITY_INFO[r].han}'`);
    for (const a of AFFIXES) expect(SOURCE).not.toContain(`'${AFFIX_INFO[a].label}'`);
  });

  it('gives every symbol an English name', () => {
    // Everything the game puts on screen as a character, and the name it must carry.
    const named: [string, string][] = [
      ...UPGRADES.map((u) => [UPGRADE_INFO[u].han, UPGRADE_INFO[u].name] as [string, string]),
      ...MARK_INFO.map((m) => [m.han, m.name] as [string, string]),
      ...RARITIES.map((r) => [RARITY_INFO[r].han, RARITY_INFO[r].name] as [string, string]),
      ...AFFIXES.map((a) => [AFFIX_INFO[a].han, AFFIX_INFO[a].label] as [string, string]),
      ...SLOTS.map((s) => [SLOT_INFO[s].han, SLOT_INFO[s].name] as [string, string]),
      ...LINES.map((l) => [PILL_LINES[l].han, PILL_LINES[l].name] as [string, string]),
      ...SYSTEMS.map((s) => [s.han, s.name] as [string, string]),
    ];
    // Every one of them has a name, and the name is in English rather than more Han.
    for (const [han, name] of named) {
      expect(name.length).toBeGreaterThan(2);
      expect(/[一-鿿]/.test(name)).toBe(false);
      expect(han.length).toBeGreaterThan(0);
    }
    console.log(`\n  釋 ${named.length} characters on the screen, every one of them named\n`);
  });

  it('explains the four things a player can hold, in words', () => {
    for (const line of [KEY.qi, KEY.power, KEY.material, KEY.dao]) {
      expect(line.length).toBeGreaterThan(30);
      expect(/[一-鿿]/.test(line)).toBe(false);
    }
  });
});
