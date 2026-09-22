import { UPGRADES, UPGRADE_INFO } from '../sim/state.ts';
import { MARK_INFO, MARKS } from '../sim/record.ts';
import { AFFIXES, AFFIX_INFO, RARITIES, RARITY_INFO, SLOTS, SLOT_INFO } from '../data/gear.ts';
import { STANCES } from '../data/arts.ts';
import { PATHS, PATH_INFO } from '../data/techniques.ts';
import { SYSTEMS } from '../sim/unlocks.ts';
import { realm as realmOf } from '../data/realms.ts';
import { LINES, PILL_LINES } from '../data/alchemy.ts';
import { KEY } from './copy.ts';

/**
 * 釋 Every character the game uses, and what it means, assembled once.
 *
 * It used to be assembled inside 釋 the key's own component, which made the key the only
 * place a player could look a character up: a single page, 4419 pixels tall, that you
 * had to leave the screen to reach and scroll to the end of to get out of. Bruno, on the
 * game as a whole: *"existe demasiado texto que nem eu percebo ou sem tooltips
 * explicado."*
 *
 * So the assembly moved here and two things read it. The key still draws the whole
 * thing, grouped, as a page to browse. 註 The tooltip reads the flat map, so a character
 * in the middle of a sentence can be tapped where it stands and answered in one line
 * without going anywhere. One definition, two places, which is the rule this game is
 * written to anyway.
 */
export interface Term {
  readonly han: string;
  readonly name: string;
  readonly note?: string;
  readonly colour?: string;
  /** An icon key, where the game draws this thing rather than only naming it. */
  readonly art?: string;
}

export interface Group {
  readonly title: string;
  readonly blurb: string;
  readonly rows: readonly Term[];
  /**
   * 義 A name for this group's sense of a character, where the same character means two
   * different things in two places.
   *
   * 劍 is 位 the weapon slot and it is also 三 the Sword path of the tree, and the flat
   * map can only hold one of them. Tapping 劍 in the tree's legend answered "Weapon",
   * which is not wrong about the character and is wrong about the screen. A group with a
   * sense also registers its rows under `sense:han`, and a <Term sense="path"> asks for
   * that one.
   */
  readonly sense?: string;
}

export const GROUPS: readonly Group[] = [
  {
    title: KEY.heldHead, blurb: KEY.heldBlurb,
    rows: [
      { han: '氣', name: 'Qi', note: KEY.qi },
      { han: '力', name: 'Power', note: KEY.power },
      { han: '材', name: 'Material', note: KEY.material },
      { han: '道', name: 'Dao points', note: KEY.dao },
    ],
  },
  {
    title: KEY.buysHead, blurb: KEY.buysBlurb,
    rows: UPGRADES.map((u) => ({
      han: UPGRADE_INFO[u].han,
      name: UPGRADE_INFO[u].name,
      art: UPGRADE_INFO[u].icon,
      note: `${UPGRADE_INFO[u].effect} · paid in ${UPGRADE_INFO[u].currency === 'qi' ? '氣 qi' : '材 material'}`,
    })),
  },
  {
    title: KEY.marksHead, blurb: KEY.marksBlurb,
    rows: MARK_INFO.map((m, i) => ({ han: m.han, name: m.name, note: KEY.mark(MARKS[i], m.pays) })),
  },
  {
    title: KEY.fightHead, blurb: KEY.fightBlurb,
    rows: [
      { han: '戰', name: 'Fight', note: KEY.fight },
      { han: '勢', name: 'Stance', note: KEY.stance(STANCES.length) },
      { han: '訣', name: 'Art', note: KEY.art },
      { han: '收', name: 'Collect', note: KEY.collect },
      { han: '退', name: 'Withdraw', note: KEY.withdraw },
    ],
  },
  {
    title: KEY.ranksHead, blurb: KEY.ranksBlurb,
    rows: RARITIES.map((r) => ({
      han: RARITY_INFO[r].han, name: RARITY_INFO[r].name,
      colour: RARITY_INFO[r].colour, note: KEY.rank(RARITY_INFO[r].mult),
    })),
  },
  {
    title: KEY.axesHead, blurb: KEY.axesBlurb, sense: 'axis',
    rows: AFFIXES.map((a) => ({ han: AFFIX_INFO[a].han, name: AFFIX_INFO[a].label })),
  },
  {
    title: KEY.slotsHead, blurb: KEY.slotsBlurb, sense: 'slot',
    rows: SLOTS.map((s) => ({ han: SLOT_INFO[s].han, name: SLOT_INFO[s].name, art: SLOT_INFO[s].empty })),
  },
  {
    title: KEY.pillsHead, blurb: KEY.pillsBlurb,
    rows: LINES.map((l) => ({
      han: PILL_LINES[l].han, name: PILL_LINES[l].name,
      note: PILL_LINES[l].effect, art: PILL_LINES[l].icon,
    })),
  },
  {
    // 三 The legend on 道 the tree names these three and nothing ever said what they
    // were. The blurb is the tree's own, so the legend and the key cannot disagree.
    title: KEY.pathsHead, blurb: KEY.pathsBlurb, sense: 'path',
    rows: PATHS.map((p) => ({
      han: PATH_INFO[p].han, name: PATH_INFO[p].name,
      colour: PATH_INFO[p].colour, note: PATH_INFO[p].blurb, art: PATH_INFO[p].icon,
    })),
  },
  {
    title: KEY.systemsHead, blurb: KEY.systemsBlurb,
    rows: SYSTEMS.map((s) => ({
      han: s.han, name: s.name, note: KEY.opensAt(realmOf(s.realm).han, realmOf(s.realm).name),
    })),
  },
  {
    title: KEY.doingHead, blurb: KEY.doingBlurb,
    rows: [
      { han: '突破', name: 'Break through', note: KEY.breakThrough },
      { han: '滿', name: 'Full', note: KEY.full },
      { han: '存', name: 'Your save', note: KEY.save },
      { han: '碑', name: 'The stele', note: KEY.stele },
      { han: '歸', name: 'Welcome back', note: KEY.back },
      { han: '拆', name: 'Melt', note: KEY.melt },
      { han: '圍', name: 'Drive', note: KEY.drive },
      { han: '凝丹', name: 'Condense', note: KEY.condense },
      { han: '入定', name: 'Sitting', note: KEY.sitting },
      { han: '境', name: 'Realm', note: KEY.realmWord },
      { han: '層', name: 'Layer', note: KEY.layerWord },
    ],
  },
];

/**
 * The flat lookup, for a character tapped where it stands.
 *
 * A bare character gets the first definition: the thing it is in the group a player
 * meets first, and the groups are in the order the game teaches them. A character whose
 * group carries a 義 sense is *also* filed under `sense:han`, so a screen that means the
 * other one can ask for it by name. See Group.sense.
 */
export const GLOSS: Readonly<Record<string, Term>> = (() => {
  const out: Record<string, Term> = {};
  for (const g of GROUPS) {
    for (const row of g.rows) {
      if (!out[row.han]) out[row.han] = row;
      if (g.sense) out[`${g.sense}:${row.han}`] = row;
    }
  }
  return out;
})();

/** Is this character one the game can explain? */
export function known(han: string): boolean {
  return Object.hasOwn(GLOSS, han);
}
