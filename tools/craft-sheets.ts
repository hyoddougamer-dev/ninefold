/**
 * 業 The workshop's art as contact sheets: eleven generations instead of 137 images.
 *
 * Bruno: *"consegues dar prompts em tabela como fizemos anteriormente para o que for
 * possível para aumentar produtividade?"* Same ruled album leaf as 張 the bestiary, same
 * cutter, same file names the game already looks for: every cell key here is the emblem
 * the workshop asks for (`craft-…`), so the day a sheet is cut its pictures are simply
 * there, and until then the screen draws the icon it draws today.
 *
 * Each cell names its own pigment, because a craft's colours are not a realm's.
 */
import type { Cell, Sheet } from './sheets.ts';

export type CraftCell = { key: string; han: string; name: string; subject: string; pigment: string; icon?: string };
export type CraftSheet = { key: string; han: string; title: string; kind: 'emblem' | 'meet' | 'figure'; cols: number; rows: number; cells: CraftCell[]; replaces: number; note: string };

const c = (key: string, han: string, name: string, subject: string, pigment: string, icon?: string): CraftCell => ({ key, han, name, subject, pigment, icon });

export const CRAFT_SHEETS: CraftSheet[] = [
  { key: 'craft-seals', han: '業印', title: 'The seven craft seals', kind: 'emblem', cols: 3, rows: 3, replaces: 9,
    note: 'O ícone de cada ofício, mais o do ranking 百業榜 e a marca de familiaridade.',
    cells: [
      c('seal-herb', '藥', 'Herb Gathering', 'a small round carved medallion showing a single herb with three leaves and a long root, in relief', 'jade'),
      c('seal-vein', '礦', 'Vein Delving', 'a small round carved medallion showing a pick crossed over a lump of ore, in relief', 'old bronze'),
      c('seal-render', '解', 'Rendering', 'a small round carved medallion showing a thin butcher’s knife lying across a single joint of bone, in relief', 'plum'),
      c('seal-alchemy', '丹', 'Alchemy', 'a small round carved medallion showing a three-legged alchemy furnace, in relief', 'gold leaf'),
      c('seal-forge', '鑄', 'Forging', 'a small round carved medallion showing an anvil with a hammer resting on it, in relief', 'copper'),
      c('seal-sigil', '符', 'Sigil Writing', 'a small round carved medallion showing a narrow paper strip with a curling tail, in relief', 'cinnabar'),
      c('seal-array', '陣', 'Arrays', 'a small round carved medallion showing a circle of eight small stones linked by fine lines, in relief', 'celadon'),
      c('seal-board', '榜', 'The Crafts Board', 'a closed ledger book bound with cord, a small brush resting across it', 'imperial violet'),
      c('seal-familiar', '熟', 'Familiarity', 'a worn wooden tool handle, polished dark where a hand has held it for years', 'amber'),
    ] },
  { key: 'craft-scenes', han: '坊', title: 'The craft scenes', kind: 'meet', cols: 2, rows: 3, replaces: 6,
    note: 'O cabeçalho de cada ofício novo e a vista da oficina. O forno e o ferreiro já existem.',
    cells: [
      c('scene-herb', '藥', 'Herb Gathering', 'a narrow mountain path in mist, a gatherer in a straw hat bending over a patch of pale herbs at the cliff edge, a woven basket on the back', 'jade'),
      c('scene-vein', '礦', 'Vein Delving', 'the mouth of a mine cut into a grey mountain, a vein of pale ore running through the rock face like a river, a lone miner with a pick small at its foot, a lantern hung on a wooden prop', 'old bronze'),
      c('scene-render', '解', 'Rendering', 'an old butcher in plain robes standing before a great ox at rest on a stone floor, a thin knife held loosely, the ox drawn in a few strokes as if already falling apart along its joints', 'plum'),
      c('scene-sigil', '符', 'Sigil Writing', 'a low writing desk by a window at night, a stack of yellow paper strips, an ink stone, a brush on a porcelain rest, one strip falling through the air, a single lantern', 'cinnabar'),
      c('scene-array', '陣', 'Arrays', 'the stone floor of a cave seen from above, a large circle traced on it, eight small stones set at its points, a cultivator kneeling at its edge with a brush', 'gold leaf'),
      c('scene-workshop', '坊', 'The workshop', 'the mouth of a cave dwelling in the mountains at dusk, a small furnace smoking, an anvil, bundles of herbs hung to dry, baskets of ore, nobody there', 'amber'),
    ] },
  { key: 'craft-herbs', han: '藥', title: 'The wild herbs', kind: 'emblem', cols: 3, rows: 3, replaces: 8,
    note: 'As oito ervas novas. Spirit Moss, Moonlight Orchid e Dragonblood Grass já estão pintadas.',
    cells: [
      c('herb-bark', '楮皮', 'Mulberry Bark', 'a curl of pale mulberry bark with a few fibres hanging loose', 'bone white', 'olive'),
      c('herb-lotus', '雪蓮', 'Snow Lotus', 'a single snow lotus with pointed pale petals and a little frost at the base', 'celadon', 'tension-snowflake'),
      c('herb-ginseng', '玉參', 'Jade Ginseng', 'a ginseng root shaped like a small person, with its leaves and one red berry', 'jade', 'spiral-bloom'),
      c('herb-fern', '星蕨', 'Starfall Fern', 'a curled fern frond with tiny pale star-shaped spots along it', 'copper', 'polar-star'),
      c('herb-vine', '雷藤', 'Thunder Vine', 'a coil of dark vine ending in a forked, lightning-shaped tendril', 'cinnabar', 'lightning-helix'),
      c('herb-beard', '龍鬚', 'Dragon’s Beard', 'a long hanging tuft of fine grass like a dragon’s whisker, tied at the top', 'plum', 'dragon-spiral'),
      c('herb-peach', '蟠桃花', 'Peach of Ages Blossom', 'a small branch of peach blossom with one ripe peach', 'imperial violet', 'laurels'),
      c('herb-lingzhi', '九葉芝', 'Nine-Leaf Lingzhi', 'a lingzhi mushroom with nine glossy layered lobes', 'amber', 'cosmic-egg'),
    ] },
  { key: 'craft-ores', han: '礦', title: 'The ores', kind: 'emblem', cols: 3, rows: 3, replaces: 9,
    note: 'Os minérios dos veios, do reino 1 ao 8.',
    cells: [
      c('ore-iron', '凡鐵', 'Mortal Iron Ore', 'a rough lump of dark iron ore', 'soot black', 'rune-stone'),
      c('ore-cinnabar', '硃砂', 'Cinnabar', 'a small cluster of cinnabar crystals', 'cinnabar', 'fire-gem'),
      c('ore-stone', '靈石', 'Spirit Stone', 'a small faceted spirit stone, clear, with a faint cloud inside it', 'celadon', 'crystal-cluster'),
      c('ore-bronze', '古銅', 'Elder Bronze Ore', 'a lump of rock threaded with veins of old bronze', 'old bronze', 'gold-nuggets'),
      c('ore-frostsilver', '霜銀', 'Frostsilver Ore', 'a lump of pale silver ore rimmed with frost', 'bone white', 'frozen-orb'),
      c('ore-jade', '碧玉', 'Jadewater Jade', 'a smooth water-worn pebble of translucent jade', 'jade', 'emerald'),
      c('ore-starfall', '落星', 'Fallen Star Iron', 'a pitted lump of meteoric iron, scorched on one side', 'copper', 'floating-crystal'),
      c('ore-thunder', '雷紋', 'Thunderscript Ore', 'a flat grey stone crossed with fine jagged lines like lightning', 'imperial violet', 'rune-stone'),
      c('ore-void', '玄晶', 'Void Crystal', 'a dark crystal like a shard of night, almost black', 'plum', 'crystal-shine'),
    ] },
  { key: 'craft-metals', han: '鑄', title: 'The nine smelted metals', kind: 'emblem', cols: 3, rows: 3, replaces: 9,
    note: 'Um por conjunto de equipamento, na cor do seu reino.',
    cells: [
      c('metal-1', '凡鐵', 'Mortal Iron Ingot', 'a plain iron ingot, rough from the mould', 'jade', 'ring-mould'),
      c('metal-2', '枯骨', 'Withered Bone Plate', 'a flat square plate of pale bone, bound with cord', 'celadon', 'ring-mould'),
      c('metal-3', '古銅', 'Elder Bronze Ingot', 'a bronze ingot with an old patina', 'old bronze', 'ring-mould'),
      c('metal-4', '霜銀', 'Frostsilver Ingot', 'a silver ingot with frost along its edges', 'gold leaf', 'ring-mould'),
      c('metal-5', '碧玉', 'Jadewater Block', 'a small square block of translucent jade', 'amber', 'ring-mould'),
      c('metal-6', '落星', 'Starfall Ingot', 'a dark ingot flecked with tiny points like stars', 'copper', 'ring-mould'),
      c('metal-7', '雷紋', 'Thunderscript Ingot', 'an ingot scored with fine jagged marks like lightning', 'cinnabar', 'ring-mould'),
      c('metal-8', '龍骸', 'Dragonwake Plate', 'a curved plate of dragon bone with a few scales still on it', 'plum', 'ring-mould'),
      c('metal-9', '仙蛻', 'Ascendant Husk', 'a thin translucent sheet like shed skin, folded once', 'imperial violet', 'ring-mould'),
    ] },
  { key: 'craft-elixirs', han: '丹', title: 'The elixirs', kind: 'emblem', cols: 3, rows: 3, replaces: 27,
    note: 'Cada linha é uma família (curar, aguentar, bater mais forte); cada coluna um escalão (reinos 1 a 3, 4 a 6, 7 a 9). O jogo tinge pela cor do reino, por isso 9 desenhos servem os 27 elixires.',
    cells: [
      c('elixir-mend-1', '回', 'Mending, low', 'a small folded paper packet of pale powder, tied with thread', 'jade', 'round-potion'),
      c('elixir-mend-2', '回', 'Mending, middle', 'a small lidded porcelain jar of salve', 'jade', 'round-potion'),
      c('elixir-mend-3', '回', 'Mending, high', 'a single round pill resting on a green leaf', 'jade', 'round-potion'),
      c('elixir-guard-1', '護', 'Guarding, low', 'a folded packet of grey powder tied with coarse string', 'old bronze', 'covered-jar'),
      c('elixir-guard-2', '護', 'Guarding, middle', 'a squat stone jar with a heavy lid', 'old bronze', 'covered-jar'),
      c('elixir-guard-3', '護', 'Guarding, high', 'a single pill patterned like a turtle’s shell', 'old bronze', 'covered-jar'),
      c('elixir-might-1', '力', 'Might, low', 'a small gourd of wine with a cork stopper', 'cinnabar', 'fire-bowl'),
      c('elixir-might-2', '力', 'Might, middle', 'a narrow flask of dark red tincture', 'cinnabar', 'fire-bowl'),
      c('elixir-might-3', '力', 'Might, high', 'a single red pill cracked with fine lines like fire', 'cinnabar', 'fire-bowl'),
    ] },
  { key: 'craft-sigils', han: '符', title: 'The nine sigils', kind: 'emblem', cols: 3, rows: 3, replaces: 9,
    note: 'Um por selo. As marcas são padrões de pincel, nunca escrita legível.',
    cells: [
      c('sigil-warding', '護身', 'Warding Sigil', 'a narrow strip of old yellow paper marked with abstract brush strokes in nested squares, a small tassel at the bottom', 'jade', 'wax-seal'),
      c('sigil-seeking', '尋物', 'Seeking Sigil', 'a narrow strip of old yellow paper marked with abstract brush strokes spiralling to a point, folded once', 'gold leaf', 'scroll-unfurled'),
      c('sigil-thunder', '雷', 'Thunder Sigil', 'a narrow strip of old yellow paper marked with abstract brush strokes like forked lightning, the lower edge scorched', 'cinnabar', 'lightning-helix'),
      c('sigil-binding', '縛妖', 'Binding Sigil', 'a narrow strip of old yellow paper marked with abstract brush strokes coiled like rope', 'soot black', 'tied-scroll'),
      c('sigil-mirror', '照妖', 'Mirror Sigil', 'a narrow strip of old yellow paper marked with an abstract circle and short rays', 'bone white', 'crystal-ball'),
      c('sigil-purity', '清心', 'Purity Sigil', 'a narrow strip of old yellow paper marked with an abstract lotus shape', 'celadon', 'yin-yang'),
      c('sigil-fivethunder', '五雷', 'Five Thunders Sigil', 'a narrow strip of old yellow paper marked with five abstract forked strokes side by side', 'imperial violet', 'lightning-helix'),
      c('sigil-soullock', '鎖魂', 'Soul-Lock Sigil', 'a narrow strip of old yellow paper marked with abstract strokes looped like a chain', 'plum', 'skull-signet'),
      c('sigil-heavenseal', '天罡', 'Heaven Seal Sigil', 'a narrow strip of old yellow paper marked with three abstract stacked strokes under a small cloud shape', 'gold leaf', 'winged-scepter'),
    ] },
  { key: 'craft-arrays', han: '陣', title: 'The nine arrays', kind: 'emblem', cols: 3, rows: 3, replaces: 9,
    note: 'Cada matriz vista de cima, como fica gravada no chão da caverna.',
    cells: [
      c('array-dew', '聚露', 'Dew-Catching Array', 'an array seen from directly above: a ring of dew drops around a single leaf', 'jade', 'spiral-bloom'),
      c('array-earthvein', '地脈', 'Earth-Vein Array', 'an array seen from directly above: a square inside a circle, lines running out from it like roots', 'old bronze', 'quake-stomp'),
      c('array-keenedge', '利刃', 'Keen-Edge Array', 'an array seen from directly above: a circle of eight small blades pointing inward', 'copper', 'crescent-blade'),
      c('array-firetame', '馴火', 'Fire-Taming Array', 'an array seen from directly above: a circle with a small flame at its centre and wave lines around it', 'cinnabar', 'flame-spin'),
      c('array-towerguard', '守塔', 'Tower-Guard Array', 'an array seen from directly above: the outline of a pagoda inside a circle', 'celadon', 'pagoda'),
      c('array-hiddendoor', '秘門', 'Hidden Door Array', 'an array seen from directly above: a circle with a small door shape at its centre and lines spiralling in', 'plum', 'vortex'),
      c('array-longwatch', '長守', 'Long-Watch Array', 'an array seen from directly above: a snake biting its own tail around a single open eye', 'amber', 'ouroboros'),
      c('array-ninepalace', '九宮', 'Nine Palaces Array', 'an array seen from directly above: a three by three grid of dots inside a circle', 'gold leaf', 'star-cycle'),
      c('array-heavenearth', '天地', 'Heaven-Earth Array', 'an array seen from directly above: a circle above a square, joined by a line of dots', 'imperial violet', 'galaxy'),
    ] },
  { key: 'craft-tools', han: '具', title: 'The seven tools and the two rarest ores', kind: 'emblem', cols: 3, rows: 3, replaces: 9 + 35,
    note: 'Uma ferramenta por ofício, desenhada uma vez. O jogo pinta-a na cor de cada um dos seis metais, por isso 7 desenhos servem as 42 ferramentas.',
    cells: [
      c('tool-sickle', '鐮', 'Sickle', 'a small curved sickle with a wooden handle', 'soot black', 'sickle'),
      c('tool-pick', '鎬', 'Pick', 'a miner’s pick with a wooden handle', 'soot black', 'quake-stomp'),
      c('tool-knife', '刀', 'Knife', 'a thin butcher’s knife with a plain handle', 'soot black', 'machete'),
      c('tool-furnace', '爐', 'Furnace', 'a small bronze three-legged furnace with a lid', 'soot black', 'cauldron'),
      c('tool-hammer', '錘', 'Hammer', 'a smith’s hammer with a heavy square head', 'soot black', 'stamper'),
      c('tool-brush', '筆', 'Brush', 'a calligraphy brush with a long bamboo handle, its tip wet', 'soot black', 'spear-feather'),
      c('tool-compass', '盤', 'Compass', 'a round geomancer’s compass seen from above, rings of plain marks and a needle at the centre, no characters', 'soot black', 'star-cycle'),
      c('ore-gold', '仙金', 'Immortal Gold', 'a small nugget of pure gold, soft and bright', 'gold leaf', 'gold-nuggets'),
      c('ore-tribstone', '劫石', 'Tribulation Stone', 'a dark stone split by one bright crack, like a stone struck by lightning', 'imperial violet', 'unstable-orb'),
    ] },
  { key: 'craft-rare', han: '珍', title: 'Rare makes and the pouch', kind: 'emblem', cols: 3, rows: 3, replaces: 6,
    note: 'Os três elixires especiais, a bolsa, os restos da caça e o material de pedido. Três painéis ficam em branco.',
    cells: [
      c('elixir-calmheart', '靜心', 'Calm Heart Pill', 'a single round pill of pale jade with a faint white cloud pattern, in a small dish', 'celadon', 'meditation'),
      c('elixir-seekincense', '尋寶', 'Treasure-Seeking Incense', 'a single stick of incense in a small bronze holder, one thin line of smoke', 'gold leaf', 'incense'),
      c('elixir-nineturn', '九轉', 'Nine-Turn Pill', 'a single pill with nine faint rings around it, resting in an open lotus', 'imperial violet', 'dragon-orb'),
      c('pouch', '儲物袋', 'The pouch', 'a small cloth drawstring pouch, full and heavy', 'amber'),
      c('remains', '殘骸', 'Remains', 'a bundle wrapped in coarse cloth and tied with rope, a bone showing at one end', 'plum'),
      c('order', '工單', 'Work order', 'a short scroll half unrolled, with rows of abstract marks, no writing', 'old bronze'),
    ] },
  { key: 'craft-robe', han: '宗師袍', title: 'The master’s robe', kind: 'figure', cols: 1, rows: 1, replaces: 1,
    note: 'Recompensa cosmética do 99. Uma pintura; o jogo muda a cor da faixa por ofício.',
    cells: [c('robe', '宗師袍', 'The master’s robe', 'a long formal cultivator’s robe hung on a plain wooden stand, deep ink-black silk with a broad sash, sleeves falling to the floor, one small square seal stitched at the collar, nothing else on the page', 'gold leaf')] },
];


/** The sheets as the cutter reads them: emblem keys prefixed `craft-`, scenes as meetings. */
export function craftSheets(): Sheet[] {
  return CRAFT_SHEETS.map((x): Sheet => ({
    key: x.key,
    han: x.han,
    title: x.title,
    kind: x.kind === 'meet' ? 'meet' : 'emblem',
    cols: x.cols,
    rows: x.rows,
    realms: x.cells.map(() => 1),
    cells: x.cells.map((c): Cell => ({
      key: x.kind === 'meet' ? `craft-${c.key.replace(/^scene-/, '')}` : `craft-${c.key}`,
      han: c.han, name: c.name, subject: c.subject, pigment: c.pigment,
    })),
  }));
}
