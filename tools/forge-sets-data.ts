/**
 * 百煉 The data the Hundredfold proposal pictures are drawn from: all nine forged sets,
 * each a full six places, with the game's own tiles, its lineage bonus, its codex bonus,
 * its forging levels, and one set (Fallen Star) worked out line by line.
 *
 *     npx tsx tools/forge-sets-data.ts <out.json>
 *
 * Read by tools/forge-ideas.mjs. Every number is the game's (REALM_SETS, baseValue,
 * SECONDARY_SHARE, AFFIX_INFO); only the codex bonuses and the forging levels are the
 * proposal's, and they are written here once.
 */
import { writeFileSync } from 'node:fs';
import { AFFIX_INFO, GEAR, REALM_SETS, SLOTS, SLOT_INFO, baseValue, roundValue, schoolOf, type Affix, type Item, type Rarity } from '../src/data/gear.ts';
import { SCHOOL_INFO } from '../src/data/schools.ts';
import { SECONDARY_SHARE } from '../src/sim/balance.ts';
import { gearTile } from '../src/art/gear.ts';
import { tierLevel } from '../src/data/crafts.ts';
import { commonsOf, wardenOf } from '../src/data/bestiary.ts';
import { realm as realmOf } from '../src/data/realms.ts';

/** 譜 What finishing each realm's set leaves for good: one system each, so no set is ever spare. */
export const CODEX = [
  { han: '狩', sys: 'Hunt', says: (k: number) => `+${5 * k}% material from every kill` },
  { han: '霸', sys: 'Elites', says: (k: number) => `elites stand ${8 * k}% weaker` },
  { han: '秘', sys: 'Vault', says: (k: number) => `vault gates stand ${8 * k}% weaker` },
  { han: '心', sys: 'Heart demon', says: (k: number) => `the heart demon stands ${5 * k}% weaker` },
  { han: '業', sys: 'Workshop', says: (k: number) => `the workshop works ${5 * k}% faster` },
  { han: '緣', sys: 'Bonds', says: (k: number) => `+${10 * k}% bond for every win` },
  { han: '瓶', sys: 'Gates', says: (k: number) => `each thing carried breaks ${0.5 * k} day more of a bottleneck` },
  { han: '塔', sys: 'Tower', says: (k: number) => `tower floors stand ${5 * k}% weaker` },
  { han: '擂', sys: 'Platform', says: (k: number) => `Platform challengers stand ${5 * k}% weaker` },
];
/** The three completion ranks and what they multiply a codex bonus by. */
export const COMPLETE = [['mystic', 1], ['earth', 1.5], ['heaven', 2]] as const;
export const LEVELS = (r: number) => {
  const unlock = tierLevel(r) + 8;
  return { mystic: unlock, earth: Math.min(98, unlock + 8), heaven: Math.min(99, unlock + 20) };
};

const pick = (r: number, slot: string, school = 'sword') =>
  GEAR.filter((g) => g.realm === r && g.slot === slot)
    .find((t) => schoolOf({ id: '', template: t.key, rarity: 'heaven', rolls: [{ affix: t.affix, value: 1 }] }) === school)
  ?? GEAR.find((g) => g.realm === r && g.slot === slot)!;
const line = (t: (typeof GEAR)[number], rarity: Rarity, a: Affix, second: boolean) =>
  roundValue(a, baseValue(t, rarity, a) * (second ? SECONDARY_SHARE : 1));

const sets = REALM_SETS.map((set, i) => {
  const r = i + 1;
  const c = commonsOf(r);
  return {
    realm: r, han: set.han, name: set.name, word: set.word, lore: set.lore, colour: realmOf(r).colour,
    axes: set.axes.map((a) => AFFIX_INFO[a].label), steps: set.steps.map((s) => ({ pieces: s.pieces,
      says: Object.entries(s.effects).map(([a, v]) => `+${v}${AFFIX_INFO[a as Affix].unit === 'flat' ? '' : '%'} ${AFFIX_INFO[a as Affix].label}`).join(', ') })),
    levels: LEVELS(r), elite: r >= 2 && c.length ? c[c.length - 1].name : null, warden: wardenOf(r)?.name ?? null,
    codex: { han: CODEX[i].han, sys: CODEX[i].sys, ranks: COMPLETE.map(([k, m]) => ({ rank: k, says: CODEX[i].says(m) })) },
    tiles: SLOTS.map((slot) => {
      const t = pick(r, slot);
      const it: Item = { id: 'x', template: t.key, rarity: 'heaven', rolls: [{ affix: t.affix, value: 1 }], from: 'forge' };
      return { slot, name: t.name, tile: gearTile(it, { size: 58 }) };
    }),
  };
});

// 落星 One set in full: a Sword build at Heaven, four lines each, two portions of every material.
const R = 6;
const SECOND: Affix[] = ['sunder', 'art', 'luck', 'refine'];
const full = SLOTS.map((slot) => {
  const t = pick(R, slot);
  const rolls = [{ affix: t.affix, value: line(t, 'heaven', t.affix, false) },
    ...SECOND.filter((a) => a !== t.affix).slice(0, 4).map((a) => ({ affix: a, value: line(t, 'heaven', a, true) }))];
  const it: Item = { id: 'x', template: t.key, rarity: 'heaven', rolls, from: 'forge' };
  return { slot: SLOT_INFO[slot].name, han: t.han, name: t.name.replace(REALM_SETS[R - 1].word, `Hundredfold ${REALM_SETS[R - 1].word}`),
    school: SCHOOL_INFO[schoolOf(it)].seal, tile: gearTile(it, { size: 64 }),
    lines: rolls.map((x) => ({ han: AFFIX_INFO[x.affix].han, label: AFFIX_INFO[x.affix].label, v: x.value, unit: AFFIX_INFO[x.affix].unit })) };
});
const totals: Record<string, { han: string; label: string; v: number; unit: string }> = {};
for (const p of full) for (const l of p.lines) {
  totals[l.label] ??= { han: l.han, label: l.label, v: 0, unit: l.unit };
  totals[l.label].v = Math.round((totals[l.label].v + l.v) * 10) / 10;
}
writeFileSync(process.argv[2], JSON.stringify({ sets, full, totals: Object.values(totals), affix: AFFIX_INFO }));
console.log('百煉', sets.length, 'sets', full.length, 'pieces');
