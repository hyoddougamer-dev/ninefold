import type { Slot } from './gear.ts';

/**
 * 道 The technique tree.
 *
 * Three paths, eight nodes each, and never enough 道 points to take them all — a full
 * run earns about forty-two against the sixty it would cost to buy everything. That
 * shortfall is the whole design: a tree you can complete is a checklist, not a choice.
 *
 * **On locking gear to a path.** The tree does not lock anything, and that is
 * deliberate. In a game whose gear falls at random, a hard class lock turns five drops
 * out of six into litter — the player is punished for the game's own dice. So instead
 * each path grants *affinity*: 鋒 Edge makes weapons count for more, 明心 Clear Mind
 * makes crowns count for more. Every piece stays wearable by everyone; what the path
 * changes is which pieces make you grin when they drop.
 */

export type Path = 'sword' | 'spirit' | 'fortune';

export const PATHS: readonly Path[] = ['sword', 'spirit', 'fortune'];

export const PATH_INFO: Record<Path, {
  han: string; name: string; colour: string; icon: string; blurb: string;
}> = {
  sword: {
    han: '劍', name: 'The Sword', colour: '#5FDCFF', icon: 'katana',
    blurb: 'Raw power, and the gear you swing or wear.',
  },
  spirit: {
    han: '神', name: 'The Spirit', colour: '#B587FF', icon: 'meditation',
    blurb: 'Gathering, and the gear you think with.',
  },
  fortune: {
    han: '運', name: 'Fortune', colour: '#FFCE6B', icon: 'crystal-cluster',
    blurb: 'What the beasts give up, and what you can carry.',
  },
};

/** What a node does. One effect each, so a node fits on one line. */
export type Effect =
  | { kind: 'power'; percent: number }
  | { kind: 'affinityOff'; slots: readonly Slot[] }
  | { kind: 'powerCut'; percent: number }
  | { kind: 'rateCut'; percent: number }
  | { kind: 'chestCap'; slots: number }
  | { kind: 'rankUp' }
  | { kind: 'rate'; percent: number }
  | { kind: 'affinity'; slots: readonly Slot[]; percent: number }
  | { kind: 'beastWeakness'; percent: number }
  | { kind: 'layerCost'; percent: number }
  | { kind: 'dropChance'; percent: number }
  | { kind: 'rarityLuck'; percent: number }
  | { kind: 'chestSlots'; slots: number }
  | { kind: 'fuseQuality'; percent: number }
  | { kind: 'alwaysDrop' };

export interface Node {
  readonly key: string;
  readonly han: string;
  readonly name: string;
  readonly path: Path;
  /** 0..7 — its depth down the branch. A node needs a node of the tier above it. */
  readonly tier: number;
  readonly cost: number;
  readonly effects: readonly Effect[];
  readonly text: string;
  /**
   * 岔 The fork. Taking this node puts the named one permanently out of reach.
   *
   * This is the whole of the theorycrafting: at the middle of each branch there are two
   * nodes and room for one. Each keystone is stronger than the node it stands beside and
   * each one gives something up — which is what turns a tree into a decision instead of
   * a queue.
   */
  readonly excludes?: string;
  /** Keystones read differently on screen: they are the choices, not the steps. */
  readonly keystone?: true;
}

const n = (
  key: string, han: string, name: string, path: Path, tier: number,
  cost: number, effects: readonly Effect[], text: string,
  extra: { excludes?: string; keystone?: true } = {},
): Node => ({ key, han, name, path, tier, cost, effects, text, ...extra });

export const NODES: readonly Node[] = [
  // 劍 The Sword — power, and affinity for what you swing and wear.
  n('opening',   '起手', 'Opening Form',   'sword', 0, 1, [{ kind: 'power', percent: 15 }], '+15% power'),
  n('edge',      '鋒',   'Edge',           'sword', 1, 1, [{ kind: 'affinity', slots: ['weapon'], percent: 40 }], 'weapons count 40% more'),
  n('chain',     '連擊', 'Chain Strike',   'sword', 2, 2, [{ kind: 'power', percent: 20 }], '+20% power'),
  n('sunder',    '破甲', 'Sunder',         'sword', 3, 2, [{ kind: 'beastWeakness', percent: 8 }], 'beasts count 8% weaker'),
  n('swordheart','劍心', 'Sword Heart',    'sword', 4, 3, [{ kind: 'power', percent: 30 }], '+30% power'),
  n('heavyplate','重甲', 'Heavy Plate',    'sword', 5, 3, [{ kind: 'affinity', slots: ['robe', 'boots'], percent: 40 }], 'robes and boots count 40% more', { excludes: 'forsake' }),
  n('forsake',   '捨甲', 'Forsake Armour', 'sword', 5, 3,
    [{ kind: 'power', percent: 60 }, { kind: 'affinityOff', slots: ['robe', 'boots'] }],
    '+60% power — but robes and boots give nothing at all', { excludes: 'heavyplate', keystone: true }),
  n('formless',  '無鋒', 'Formless Edge',  'sword', 6, 4, [{ kind: 'power', percent: 45 }], '+45% power'),
  n('tenthousand','萬劍','Ten Thousand Swords', 'sword', 7, 4, [{ kind: 'power', percent: 80 }], '+80% power'),

  // 神 The Spirit — the gathering rate, and affinity for what you think with.
  n('breathing', '吐納', 'Breathing',      'spirit', 0, 1, [{ kind: 'rate', percent: 15 }], '+15% qi per second'),
  n('clearmind', '明心', 'Clear Mind',     'spirit', 1, 1, [{ kind: 'affinity', slots: ['crown'], percent: 40 }], 'crowns count 40% more'),
  n('circulation','周天','Circulation',    'spirit', 2, 2, [{ kind: 'rate', percent: 20 }], '+20% qi per second'),
  n('focus',     '凝神', 'Focus',          'spirit', 3, 2, [{ kind: 'affinity', slots: ['talisman', 'ring'], percent: 40 }], 'talismans and rings count 40% more'),
  n('inner',     '內景', 'Inner Landscape','spirit', 4, 3, [{ kind: 'rate', percent: 30 }], '+30% qi per second'),
  n('travel',    '神遊', 'Spirit Travel',  'spirit', 5, 3, [{ kind: 'layerCost', percent: 6 }], 'layers cost 6% less qi', { excludes: 'forget' }),
  n('forget',    '忘機', 'Forget the Mechanism', 'spirit', 5, 3,
    [{ kind: 'layerCost', percent: 18 }, { kind: 'powerCut', percent: 45 }],
    'layers cost 18% less — but you lose 45% of your power', { excludes: 'travel', keystone: true }),
  n('greatvoid', '太虛', 'Great Void',     'spirit', 6, 4, [{ kind: 'rate', percent: 45 }], '+45% qi per second'),
  n('transcend', '化境', 'Transcendence',  'spirit', 7, 4, [{ kind: 'rate', percent: 80 }], '+80% qi per second'),

  // 運 Fortune — what falls, and what you can keep.
  n('gleaning',  '拾遺', 'Gleaning',       'fortune', 0, 1, [{ kind: 'dropChance', percent: 5 }], '+5 points of drop chance'),
  n('keeneye',   '慧眼', 'Discerning Eye', 'fortune', 1, 1, [{ kind: 'rarityLuck', percent: 25 }], 'rarer drops, 25% more often'),
  n('pouch',     '囊',   'Pouch',          'fortune', 2, 2, [{ kind: 'chestSlots', slots: 8 }], '+8 places in the chest'),
  n('defthands', '巧手', 'Deft Hands',     'fortune', 3, 2, [{ kind: 'fuseQuality', percent: 12 }], 'fusions come out 12% better'),
  n('goodluck',  '福緣', 'Good Fortune',   'fortune', 4, 3, [{ kind: 'dropChance', percent: 10 }], '+10 points of drop chance'),
  n('favour',    '天眷', "Heaven's Favour",'fortune', 5, 3, [{ kind: 'rarityLuck', percent: 60 }], 'rarer drops, 60% more often', { excludes: 'emptypouch' }),
  n('emptypouch','空囊', 'Empty Pouch',    'fortune', 5, 3,
    [{ kind: 'rankUp' }, { kind: 'chestCap', slots: 12 }],
    'every drop comes one rank higher — but the chest holds only 12', { excludes: 'favour', keystone: true }),
  n('treasury',  '寶庫', 'Treasury',       'fortune', 6, 4, [{ kind: 'chestSlots', slots: 12 }], '+12 places in the chest'),
  n('creation',  '造化', 'Creation',       'fortune', 7, 4, [{ kind: 'alwaysDrop' }], 'every beast drops something'),
];

export const NODE_BY_KEY: Readonly<Record<string, Node>> =
  Object.fromEntries(NODES.map((x) => [x.key, x]));

export function nodesOf(path: Path): readonly Node[] {
  return NODES.filter((x) => x.path === path).sort((a, b) => a.tier - b.tier);
}

/** Everything the tree costs if you tried to buy all of it. */
export const TOTAL_COST = NODES.reduce((sum, x) => sum + x.cost, 0);
