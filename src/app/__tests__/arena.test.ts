import { describe, expect, it } from 'vitest';
import { commonsOf } from '../../data/bestiary.ts';
import { beastPower, fight } from '../../sim/combat.ts';
import { newState, power } from '../../sim/state.ts';
import { BEAT_MS, beatsIn, frameAt, roundOf, strikerOf } from '../ui/Arena.tsx';

/**
 * The arena only plays back what the sim already settled, but *how* it plays it back is
 * the whole of watching a fight — so the attribution of each blow is worth a test.
 */
const anyFight = () => {
  const beast = commonsOf(3)[1];
  // An even match, found rather than guessed: a blowout is one round and tells us
  // nothing about how long a fight the player will actually sit through.
  const at = (technique: number) =>
    ({ ...newState(0), realm: 3, layer: 8, levels: { technique, method: 0, pills: 0, cores: 0 } });
  let best = at(0);
  for (let t = 0; t <= 80; t++) {
    if (Math.abs(power(at(t)) - beastPower(beast)) < Math.abs(power(best) - beastPower(beast))) {
      best = at(t);
    }
  }
  return { beast, outcome: fight(best, beast, 12345) };
};

describe('戰 the playback', () => {
  it('shows a round as two beats — the strike, then the answer', () => {
    const { outcome } = anyFight();
    expect(beatsIn(outcome)).toBe(outcome.rounds.length * 2);

    for (let beat = 0; beat < beatsIn(outcome); beat++) {
      expect(roundOf(beat)).toBe(Math.floor(beat / 2));
    }
    expect(strikerOf(0)).toBe('player');
    expect(strikerOf(1)).toBe('beast');
    expect(strikerOf(8)).toBe('player');
  });

  it('never lets a blow land on the wrong side', () => {
    const { outcome } = anyFight();
    for (let beat = 0; beat < beatsIn(outcome); beat++) {
      const f = frameAt(outcome, beat);
      const round = outcome.rounds[f.round];
      // The cultivator's blow shows the cultivator's damage, and vice versa.
      expect(f.damage).toBe(f.striker === 'player' ? round.playerDamage : round.beastDamage);
      // The cultivator only loses health on the beast's beat: on their own, the bar
      // still reads what it read at the end of the round before.
      if (f.striker === 'player' && f.round > 0) {
        expect(f.playerHealth).toBe(outcome.rounds[f.round - 1].playerHealth);
      }
      if (f.striker === 'beast') expect(f.playerHealth).toBe(round.playerHealth);
      // The beast's bar always reads this round's value: its wound is shown as it lands.
      expect(f.beastHealth).toBe(round.beastHealth);
    }
  });

  it('never runs a bar backwards, and never reads past the end', () => {
    const { outcome } = anyFight();
    let lastPlayer = 1;
    let lastBeast = 1;
    for (let beat = 0; beat < beatsIn(outcome) + 4; beat++) {
      const f = frameAt(outcome, beat);
      expect(f.playerHealth).toBeLessThanOrEqual(lastPlayer + 1e-9);
      expect(f.beastHealth).toBeLessThanOrEqual(lastBeast + 1e-9);
      lastPlayer = f.playerHealth;
      lastBeast = f.beastHealth;
    }
  });

  it('stays short enough to watch without waiting', () => {
    const { outcome } = anyFight();
    const seconds = (beatsIn(outcome) * BEAT_MS) / 1000;
    console.log(`\n  a fight is ${outcome.rounds.length} rounds · ${beatsIn(outcome)} beats ` +
      `· ${seconds.toFixed(1)}s to watch\n`);
    expect(seconds).toBeLessThan(6);
  });

  it('holds for the longest fight the sim can produce', () => {
    // 24 rounds is the sim's cap; the playback must not outstay its welcome even then.
    expect((24 * 2 * BEAT_MS) / 1000).toBeLessThan(9);
  });
});
