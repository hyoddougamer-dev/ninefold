/**
 * 形 Three drawings for every shape: mortal (realms 1 to 3), spirit (4 to 6) and
 * immortal (7 to 9).
 *
 * Bruno: *"cada item deve ter o seu icone e ser diferente"*. A sword of the first realm
 * and a sword of the ninth were one drawing in two frames. Now the drawing grows grander
 * with the era, and art/gear.ts paints it in the lineage's own material, so no two of
 * the 486 pieces look alike: 162 drawings, all different, times nine materials.
 *
 * Every name is a file from game-icons.net (CC BY 3.0), chosen by looking at it, and
 * `npm run icons` pulls them into icons.generated.ts. `gear.test.ts` holds that all 162
 * are different and none is borrowed from a beast or the interface.
 */
export const ERA_ICONS: Readonly<Record<string, readonly [string, string, string]>> = {
  sword: ['broadsword', 'rune-sword', 'winged-sword'],
  saber: ['machete', 'katana', 'sparkling-sabre'],
  crescent: ['crescent-blade', 'glaive', 'crescent-staff'],
  hooks: ['sai', 'hook-swords', 'kusarigama'],
  spear: ['barbed-spear', 'spear-feather', 'sun-spear'],
  fan: ['handheld-fan', 'feathered-wing', 'fire-tail'],
  staff: ['bo', 'wizard-staff', 'winged-scepter'],
  trident: ['trident', 'magic-trident', 'flaming-trident'],
  scythe: ['sickle', 'scythe', 'reaper-scythe'],
  robe: ['robe', 'ninja-armor', 'warlock-hood'],
  vest: ['leather-vest', 'armor-vest', 'heart-armor'],
  kimono: ['kimono', 'travel-dress', 'heavy-collar'],
  cloak: ['hood', 'cloak', 'vampire-cape'],
  lamellar: ['chain-mail', 'scale-mail', 'lamellar'],
  plate: ['chest-armor', 'breastplate', 'abdominal-armor'],
  pauldrons: ['pauldrons', 'shoulder-armor', 'spiked-shoulder-armor'],
  wings: ['wing-cloak', 'angel-outfit', 'fairy-wings'],
  mantle: ['poncho', 'cape', 'cape-armor'],
  band: ['bandana', 'headband-knot', 'turban'],
  laurel: ['olive', 'laurels', 'laurel-crown'],
  pin: ['comb', 'crystal-earrings', 'jewel-crown'],
  horned: ['viking-helmet', 'horned-helm', 'warlord-helmet'],
  bonecrown: ['crenel-crown', 'horned-skull', 'crowned-skull'],
  visor: ['light-helm', 'visored-helm', 'overlord-helm'],
  diadem: ['tiara', 'queen-crown', 'imperial-crown'],
  ritual: ['cowled', 'pope-crown', 'sharp-crown'],
  dragonhead: ['horned-reptile', 'dragon-head', 'drakkar-dragon'],
  bare: ['footprint', 'barefoot', 'stomp'],
  sandals: ['flip-flops', 'wooden-clogs', 'sandal'],
  tabi: ['socks', 'slippers', 'tabi-boot'],
  walkers: ['boot-prints', 'walking-boot', 'ski-boot'],
  leather: ['chelsea-boot', 'leather-boot', 'cowboy-boot'],
  greaves: ['armor-cuisses', 'greaves', 'leg-armor'],
  ironboots: ['steeltoe-boots', 'metal-boot', 'quake-stomp'],
  furboots: ['rubber-boot', 'fur-boot', 'boot-stomp'],
  windfoot: ['sonic-shoes', 'wingfoot', 'stomp-tornado'],
  charm: ['stamper', 'wax-seal', 'rune-stone'],
  bonecharm: ['primitive-necklace', 'tribal-pendant', 'medal-skull'],
  beads: ['prayer-beads', 'pearl-necklace', 'double-necklace'],
  scroll: ['tied-scroll', 'spell-book', 'burning-book'],
  pendant: ['necklace', 'gem-pendant', 'intricate-necklace'],
  medal: ['sport-medal', 'medal', 'star-medal'],
  censer: ['covered-jar', 'incense', 'fire-bowl'],
  orb: ['crystal-ball', 'double-ringed-orb', 'unstable-orb'],
  wand: ['orb-wand', 'crystal-wand', 'lunar-wand'],
  plainring: ['ring', 'linked-rings', 'ouroboros'],
  topaz: ['globe-ring', 'topaz', 'prism'],
  amethyst: ['diamond-ring', 'amethyst', 'floating-crystal'],
  emerald: ['big-diamond-ring', 'emerald', 'crystal-shine'],
  flamering: ['ring-mould', 'fire-ring', 'flame-spin'],
  frostring: ['frozen-ring', 'frozen-orb', 'tension-snowflake'],
  powerring: ['skull-signet', 'power-ring', 'skull-ring'],
  spiralring: ['swirl-ring', 'cloud-ring', 'vortex'],
  starring: ['star-cycle', 'ringed-planet', 'star-satellites'],
};

/** Which of the three drawings a realm's piece uses. */
export function eraOf(realm: number): 0 | 1 | 2 {
  return realm <= 3 ? 0 : realm <= 6 ? 1 : 2;
}
