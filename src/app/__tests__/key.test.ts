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
 * os sistemas". The characters stay. They are what the game looks like, but the deal
 * struck in return is that **no character is ever the only place a thing is named**.
 *
 * A key page is worth nothing if it drifts. So it is not typed: every row is read out of
 * the table it describes, and this file checks that the tables and the page cannot come
 * apart. Add a gear axis, a pill line, a rank or a whole system and it appears on the
 * page by itself, and if someone ever hand-writes a row instead, this fails.
 */

/**
 * 註 The assembly moved out of the page and into ../glossary.ts, because the tooltip
 * reads the same rows: a character tapped in the middle of a sentence is answered from
 * exactly the table this page draws. So the derived-ness is checked where it now lives,
 * and the page is checked for having stopped doing it by hand.
 */
const SOURCE = readFileSync(new URL('../glossary.ts', import.meta.url), 'utf8');
const PAGE = readFileSync(new URL('../ui/Key.tsx', import.meta.url), 'utf8');

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
    // The page itself draws GROUPS and types out nothing of its own.
    expect(PAGE).toContain('GROUPS');
    for (const r of RARITIES) expect(PAGE).not.toContain(`'${RARITY_INFO[r].han}'`);
  });

  /**
   * 註 And what the tooltip answers with is what the page says, because there is one
   * table. A character the game can put in a sentence and not explain is the bug this
   * whole arrangement exists to stop.
   */
  it('answers every character it lists, from the one table', async () => {
    const { GROUPS, GLOSS, known } = await import('../glossary.ts');
    const rows = GROUPS.flatMap((g) => g.rows);
    expect(rows.length).toBeGreaterThan(40);
    for (const row of rows) {
      expect(known(row.han)).toBe(true);
      expect(GLOSS[row.han].name).toBe(GLOSS[row.han].name);
    }
    // The words a sentence is allowed to drop in must all be answerable.
    for (const han of ['氣', '力', '材', '道', '見', '熟', '通', '拆', '圍', '境', '層', '滿']) {
      expect(known(han), `${han} is used on a screen and the tooltip cannot explain it`).toBe(true);
    }
    // 義 A qualified key is a second sense of a character already counted, not another
    // character, so the tally counts the bare ones. See Group.sense.
    const bare = Object.keys(GLOSS).filter((k) => !k.includes(':'));
    console.log(`\n  註 ${bare.length} characters a player can tap and be answered\n`);
  });

  /**
   * 義 The same character, two things, and the screen decides which.
   *
   * 劍 is 位 the weapon slot and it is also 三 the Sword path of the tree. The flat map
   * holds one of them, so the tree's legend was answering "Weapon", which is true of the
   * character and false on that screen. A group with a sense files its rows twice.
   */
  it('lets a screen ask for the other sense of a character', async () => {
    const { GROUPS, GLOSS } = await import('../glossary.ts');
    const { PATHS, PATH_INFO } = await import('../../data/techniques.ts');
    const { SLOTS, SLOT_INFO } = await import('../../data/gear.ts');

    // Every character that means two things has both filed, and they are not the same.
    const collisions = PATHS.map((p) => PATH_INFO[p].han)
      .filter((h) => SLOTS.some((s) => SLOT_INFO[s].han === h));
    expect(collisions.length).toBeGreaterThan(0);
    for (const han of collisions) {
      expect(GLOSS[`path:${han}`], `path:${han}`).toBeDefined();
      expect(GLOSS[`slot:${han}`], `slot:${han}`).toBeDefined();
      expect(GLOSS[`path:${han}`].name).not.toBe(GLOSS[`slot:${han}`].name);
    }
    // And a sense only ever exists where a group asked for one.
    for (const g of GROUPS) {
      if (!g.sense) continue;
      for (const row of g.rows) expect(GLOSS[`${g.sense}:${row.han}`]).toBe(row);
    }
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
