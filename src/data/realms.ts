/**
 * 九境 The nine realms.
 *
 * The names are the genre's canonical ladder — any xianxia reader knows the order by
 * heart, the way a player knows levels 1 to 9. What each realm adds is the *aura*, and
 * the rule is that a realm must be readable from the aura alone, without reading a word.
 */
export interface Realm {
  readonly n: number;
  readonly han: string;
  readonly name: string;
  /** The realm's colour. Walks from cyan to magenta as you climb. */
  readonly colour: string;
  /** Aura icons stacked behind the figure, outermost first. */
  readonly aura: readonly string[];
  /** Rings drawn behind the head. A halo reads better drawn than as an icon. */
  readonly halos: number;
  readonly gains: string;
}

export const REALMS: readonly Realm[] = [
  { n: 1, han: '練氣', name: 'Qi Refining',    colour: '#5FDCFF', aura: [], halos: 0,
    gains: 'nothing yet — only the breath' },
  { n: 2, han: '築基', name: 'Foundation',     colour: '#5FC4FF', aura: ['aura'], halos: 0,
    gains: 'the first glow, faint and steady' },
  { n: 3, han: '金丹', name: 'Golden Core',    colour: '#77AEFF', aura: ['aura'], halos: 1,
    gains: '圓光 the halo — the first sign read from across a room' },
  { n: 4, han: '元嬰', name: 'Nascent Soul',   colour: '#9B9BFF', aura: ['aura', 'sparkles'], halos: 1,
    gains: '塵 motes of qi loose in the air' },
  { n: 5, han: '化神', name: 'Spirit Severing', colour: '#B587FF', aura: ['rear-aura', 'sparkles'], halos: 1,
    gains: 'the aura takes on a body behind you' },
  { n: 6, han: '煉虛', name: 'Void Refining',  colour: '#CC79FF', aura: ['beams-aura', 'rear-aura', 'sparkles'], halos: 1,
    gains: '芒 spokes radiating from the seat' },
  { n: 7, han: '合體', name: 'Unity',          colour: '#E571F0', aura: ['beams-aura', 'icicles-aura', 'sparkles'], halos: 2,
    gains: 'a second halo, and blades of qi circling' },
  { n: 8, han: '大乘', name: 'Great Vehicle',  colour: '#FF63CE', aura: ['rolling-energy', 'beams-aura', 'rear-aura', 'sparkles'], halos: 2,
    gains: 'the energy begins to turn on its own' },
  { n: 9, han: '渡劫', name: 'Tribulation',    colour: '#FF5AA6', aura: ['lightning-helix', 'rolling-energy', 'beams-aura', 'sparkles'], halos: 3,
    gains: '九雷 the nine bolts, and the ceiling of the game' },
];

export function realm(n: number): Realm {
  return REALMS[Math.max(0, Math.min(REALMS.length - 1, n - 1))];
}
