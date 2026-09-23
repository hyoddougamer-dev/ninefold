/**
 * 缺 What is painted, what is still a pictogram, and what nothing is looking at.
 *
 * 張 The sheet page reads FAMILIES from here, so the page and this report cannot say
 * different things about the same gap.
 *
 * 量 Bruno: *"valida arte que ainda se encontra em falta para integrarmos tudo."* A grep
 * for `icon(` answers that badly: it finds call sites, not things, and it counts the one
 * line that draws twenty-seven arts as one. This reads the game's own tables, so a family
 * that gains a member is counted the next time this runs, and it says for each family how
 * many there are, where they are seen and what a sheet for them would cost.
 *
 * 棄 It also reports the other direction, which is the one nobody goes looking for: a
 * painted kind the game declares and never reads. Nine heaven backdrops were sitting in
 * 畫 the picture list with nothing on any screen asking for them.
 *
 * Run with `npm run artgaps`.
 */
import { readFileSync, readdirSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { BEASTS, HEAVEN_PLATES } from '../src/data/bestiary.ts';
import { REALMS } from '../src/data/realms.ts';
import { HEAVENS } from '../src/data/heavens.ts';
import { MEETINGS } from '../src/data/meetings.ts';
import { FIGURES } from '../src/data/figures.ts';
import { ARTS, STANCES } from '../src/data/arts.ts';
import { ALL_CARDS } from '../src/data/awakening.ts';
import { HERBS } from '../src/data/herbs.ts';
import { PILL_LINES } from '../src/data/alchemy.ts';
import { ROOM_INFO } from '../src/data/secret.ts';
import { ALL_NODES } from '../src/data/techniques.ts';
import { GEAR } from '../src/data/gear.ts';
import { PICTURES, type Painted } from '../src/data/pictures.ts';

/** Everything in the game that is drawn as a thing, painted or not. */
export interface Family {
  readonly han: string;
  readonly name: string;
  readonly count: number;
  /** The painted kind that covers it, or null while it is still a pictogram. */
  readonly kind: Painted | null;
  /** 名 Which slice of a shared kind is this family's, when several share one. */
  readonly prefix?: string;
  readonly seen: string;
  /** What a sheet for it would be, when it does not have one. */
  readonly sheet?: string;
}

export const FAMILIES: readonly Family[] = [
  { han: '獸', name: 'creatures', count: BEASTS.length, kind: 'beast',
    seen: '狩 the hunt list, 錄 the bestiary, 塔 a tower floor, 鬥 the arena' },
  { han: '龍', name: "the heavens' Dragons", count: HEAVEN_PLATES.length, kind: 'beast',
    seen: '鬥 the arena and 修 the card, above the ninth realm' },
  { han: '境', name: 'realms', count: REALMS.length, kind: 'realm',
    seen: '境 the realm card, and behind 鬥 the arena' },
  { han: '修', name: 'the cultivator', count: FIGURES.length * REALMS.length, kind: 'self',
    seen: 'every screen with a portrait on it' },
  { han: '緣', name: 'encounters', count: MEETINGS.length, kind: 'meet',
    seen: '修 the card that stops the game' },
  { han: '境外', name: 'heaven backdrops', count: HEAVENS.length, kind: 'heaven',
    seen: '鬥 behind a fight above the ninth realm' },
  { han: '悟道', name: 'awakening cards', count: ALL_CARDS.length, kind: 'emblem',
    prefix: 'card-', seen: '悟道 the sheet at every breakthrough',
    sheet: '悟甲 and 悟乙, two sheets of twelve' },
  { han: '訣', name: 'arts', count: ARTS.length, kind: 'emblem', prefix: 'art-',
    seen: '勢 the loadout', sheet: '訣, one sheet of nine' },
  // 誤 This family was listed as a pictogram and it is not one. A stance is a chip with
  // its character on it and no symbol at all, which the sheet only found out when it
  // asked STANCES for an icon and there was none. An audit can over-count as easily as
  // it can under-count, and the over-count is the one that gets a credit spent.
  { han: '勢', name: 'stances', count: STANCES.length, kind: null,
    seen: '勢 the loadout, as a character chip',
    sheet: 'none: a stance is not drawn as a symbol, it is a character and a name' },
  { han: '器', name: 'gear templates', count: GEAR.length, kind: null,
    seen: '器 the gear screen, every chest row, every drop',
    sheet: 'drawn by the game from the template and the rarity, and it already reads' },
  { han: '草', name: 'herbs', count: HERBS.length, kind: 'emblem', prefix: 'herb-',
seen: '洞天 the cave beds', sheet: '雜, shared with the pills and the rooms' },
  { han: '丹', name: 'pill lines', count: Object.keys(PILL_LINES).length, kind: 'emblem',
    prefix: 'pill-', seen: '爐 the furnace', sheet: '雜, shared with the herbs and the rooms' },
  { han: '秘境', name: 'secret realm rooms', count: Object.keys(ROOM_INFO).length, kind: 'emblem',
    prefix: 'room-', seen: '秘境 the vault, and its doorway on 狩',
    sheet: '雜, shared with the herbs and the pills' },
  { han: '道', name: 'technique nodes', count: ALL_NODES.length, kind: null,
    seen: '道 the path tree',
    sheet: 'none: they are dots on a tree at 30px and a painting would not survive it' },
];

/** How many of a family are painted, which is not simply the kind's own count. */
export function paintedIn(f: Family): number {
  if (!f.kind) return 0;
  const all = PICTURES[f.kind];
  const mine = f.prefix ? all.filter((k) => k.startsWith(f.prefix!))
    : f.han === '龍' ? all.filter((k) => k.startsWith('heaven-'))
    : f.han === '獸' ? all.filter((k) => !k.startsWith('heaven-'))
    : all;
  return Math.min(mine.length, f.count);
}

/* ── 棄 a painted kind nothing reads ────────────────────────────────────── */

const SRC = 'src';
function every(dir: string): string[] {
  return readdirSync(dir, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? every(`${dir}/${e.name}`)
      : /\.tsx?$/.test(e.name) ? [`${dir}/${e.name}`] : []);
}
const code = every(SRC)
  .filter((f) => !f.includes('__tests__') && !f.endsWith('data/pictures.ts'))
  .map((f) => readFileSync(f, 'utf8'))
  .join('\n');
const KINDS: readonly Painted[] = ['beast', 'realm', 'heaven', 'cut', 'self', 'meet'];
// 讀 A kind is read either by name, `pictureOf('realm', …)`, or through 牌 the plate,
// which takes the kind as a prop and is written `kind="beast"` at the call site. Looking
// only for the first said the bestiary's own thirty-six were unread, which is the audit
// being wrong in the direction that wastes the most time.
const unread = KINDS.filter((k) =>
  !new RegExp(`pictureOf\\(\\s*'${k}'`).test(code) && !code.includes(`kind="${k}"`));

/* ── 報 the report ──────────────────────────────────────────────────────── */

if (!process.argv[1] || import.meta.url !== pathToFileURL(process.argv[1]).href) {
  // Imported for FAMILIES, not run. See 張 the sheet page.
} else {
console.log('\n缺 what the game still draws as a pictogram\n');
const pad = (s: string, n: number) => s + ' '.repeat(Math.max(0, n - [...s].length));
let painted = 0;
let total = 0;
for (const f of FAMILIES) {
  const have = paintedIn(f);
  painted += have;
  total += f.count;
  const mark = !f.kind ? '·' : have >= f.count ? '✓' : '·';
  console.log(`  ${mark} ${pad(f.han, 5)} ${pad(f.name, 22)} ${String(have).padStart(3)} of ${pad(String(f.count), 4)} ${f.seen}`);
  if (f.sheet) console.log(`        ${' '.repeat(22)}     ${f.sheet}`);
}
console.log(`\n  ${painted} of ${total} painted.\n`);

if (unread.length) {
  console.log('  棄 declared and never read by any screen:');
  for (const k of unread) console.log(`    ${k}  ${PICTURES[k].length} file(s) nothing is looking at`);
  console.log();
}
}
