/**
 * 九境 The nine realms.
 *
 * The names are the genre's canonical ladder: any xianxia reader knows the order by
 * heart, the way a player knows levels 1 to 9. What each realm adds is the *aura*, and
 * the rule is that a realm must be readable from the aura alone, without reading a word.
 *
 * `gains` is shown under the progress bar, so it says what the player will *see* when
 * they arrive. The first draft described the design intent instead: "the first sign
 * read from across a room" is a note to the artist, not a line for the player.
 */
export interface Realm {
  readonly n: number;
  readonly han: string;
  readonly name: string;
  /**
   * The realm's pigment. Walks jade, then gold, then cinnabar, then imperial violet.
   *
   * 色 These are ground minerals rather than screen colours, and that is the whole point.
   * The ramp used to run cyan to magenta on blue-black, which is a science fiction
   * palette wearing Chinese characters: Bruno, on seeing it beside the paintings,
   * *"demasiado neon"*. Green is the first breath and the body, gold is the core, red is
   * the furnace and the tribulation, and violet is what is left after all of it.
   *
   * 讀 Each is lifted a little off the true pigment, because a realm has to be readable
   * as text on the dark ground and true cinnabar at #B4332C is not. The pigment itself
   * lives in the paintings; this is the pigment seen by lamplight.
   */
  readonly colour: string;
  /** What the pigment is, so the page and the prompts can name it in English. */
  readonly stuff: string;
  /** Aura icons stacked behind the figure, outermost first. */
  readonly aura: readonly string[];
  /** Rings drawn behind the head. A halo reads better drawn than as an icon. */
  readonly halos: number;
  readonly gains: string;
}

export const REALMS: readonly Realm[] = [
  { n: 1, han: '練氣', name: 'Qi Refining',    colour: '#6E9C84', stuff: 'jade', aura: [], halos: 0,
    gains: 'No aura yet. Only your breath.' },
  { n: 2, han: '築基', name: 'Foundation',     colour: '#86AE8C', stuff: 'celadon', aura: ['aura'], halos: 0,
    gains: 'A faint glow, steady.' },
  { n: 3, han: '金丹', name: 'Golden Core',    colour: '#B2A566', stuff: 'old bronze', aura: ['aura'], halos: 1,
    gains: '圓光 a halo behind your head.' },
  { n: 4, han: '元嬰', name: 'Nascent Soul',   colour: '#D2B35B', stuff: 'gold leaf', aura: ['aura', 'sparkles'], halos: 1,
    gains: '塵 motes of qi in the air.' },
  { n: 5, han: '化神', name: 'Spirit Severing', colour: '#DFA555', stuff: 'amber', aura: ['rear-aura', 'sparkles'], halos: 1,
    gains: 'Your aura takes shape behind you.' },
  { n: 6, han: '煉虛', name: 'Void Refining',  colour: '#D07C4A', stuff: 'copper', aura: ['beams-aura', 'rear-aura', 'sparkles'], halos: 1,
    gains: '芒 spokes of light from where you sit.' },
  { n: 7, han: '合體', name: 'Unity',          colour: '#CB5347', stuff: 'cinnabar', aura: ['beams-aura', 'icicles-aura', 'sparkles'], halos: 2,
    gains: 'A second halo. Blades of qi circle you.' },
  { n: 8, han: '大乘', name: 'Great Vehicle',  colour: '#BE5B72', stuff: 'plum', aura: ['rolling-energy', 'beams-aura', 'rear-aura', 'sparkles'], halos: 2,
    gains: 'The energy starts turning by itself.' },
  { n: 9, han: '渡劫', name: 'Tribulation',    colour: '#A077B8', stuff: 'imperial violet', aura: ['lightning-helix', 'rolling-energy', 'beams-aura', 'sparkles'], halos: 3,
    gains: '九雷 the nine bolts. The top of the climb.' },
];

export function realm(n: number): Realm {
  return REALMS[Math.max(0, Math.min(REALMS.length - 1, n - 1))];
}
