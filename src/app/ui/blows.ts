/**
 * 話 What the blow is called.
 *
 * One line under the fight, replaced each beat. It is the one thing kept from the scroll
 * proposal: a fight of pure numbers reads as arithmetic, and four characters of the
 * genre's own language costs nothing and turns it into a duel.
 *
 * Two registers, kept apart on purpose. A line that says *your body sways* while you are
 * the one swinging is not flavour, it is a bug — the first draft had one pool and cycled
 * it, and it said exactly that.
 */

export interface Blow {
  readonly han: string;
  readonly text: string;
}

const STRIKES: readonly Blow[] = [
  { han: '劍光掠過', text: 'the blade light passes' },
  { han: '一步踏出', text: 'one step forward' },
  { han: '氣勢壓下', text: 'the pressure comes down' },
  { han: '掌風如雷', text: 'the palm wind like thunder' },
  { han: '攻其不備', text: 'it never saw it' },
  { han: '以快打快', text: 'speed answered with speed' },
];

const ANSWERS: readonly Blow[] = [
  { han: '反撲而來', text: 'it comes back at you' },
  { han: '硬接一記', text: 'you take it standing' },
  { han: '身形一晃', text: 'your footing goes' },
  { han: '護體氣散', text: 'your guard scatters' },
  { han: '退了半步', text: 'half a step back' },
  { han: '痛入骨髓', text: 'it reaches the bone' },
];

/**
 * Deterministic in the round, so a re-render never reshuffles the line under a blow that
 * is still on screen.
 */
export function blowLine(striker: 'player' | 'beast', round: number): Blow {
  const pool = striker === 'player' ? STRIKES : ANSWERS;
  return pool[round % pool.length];
}

/** The last word, once it is over. */
export function verdictLine(won: boolean, warden: boolean): Blow {
  if (!won) return { han: '再來', text: 'Nothing was lost. Come back stronger.' };
  return warden
    ? { han: '境破', text: 'The warden is down. The breakthrough is open.' }
    : { han: '勝', text: 'It will not rise again.' };
}
