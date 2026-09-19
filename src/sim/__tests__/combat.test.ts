import { describe, expect, it } from 'vitest';
import { BEASTS, commonsOf, wardenOf } from '../../data/bestiary.ts';
import { LAYERS_PER_REALM, REALM_COST } from '../balance.ts';
import { beastPower, fight, odds, referencePower } from '../combat.ts';
import { buy, canBuy, newState, power, type State } from '../state.ts';
import { advance } from '../time.ts';

const T0 = 1_700_000_000;

/**
 * A cultivator at the *top* of the given realm — all nine layers open — having spent
 * nothing on upgrades. The top matters: it is what referencePower measures against, and
 * measuring a realm's floor against the reference for its ceiling loses half a ladder.
 */
function bare(realm: number): State {
  let s = newState(T0);
  let t = T0;
  // The ninth realm has no exit: its layers never open, so arriving *is* its ceiling.
  // Waiting for the ninth layer of the ninth realm is waiting forever.
  const target = realm === 9 ? 0 : LAYERS_PER_REALM - 1;
  for (let i = 0; i < 24 * 600; i++) {
    if (s.realm === realm && s.layer >= target) return s;
    t += 3600;
    s = advance(s, t, true);
  }
  throw new Error(`never reached realm ${realm}`);
}

/** The player in the middle: reached the realm and put a share of earned qi into power. */
function invested(realm: number, share = 0.35): State {
  let s = { ...bare(realm), qi: 0 };
  let bank = 0;
  for (let i = 0; i < realm; i++) {
    const c = REALM_COST[i];
    if (Number.isFinite(c)) bank += c;
  }
  s = { ...s, qi: bank * share };
  while (canBuy(s, 'technique')) s = buy(s, 'technique');
  return s;
}

describe('戰 the beasts', () => {
  it('prints the power table and keeps the ladder climbing', () => {
    const rows = [1, 2, 3, 4, 5, 6, 7, 8, 9].map((r) => {
      const s = bare(r);
      const g = wardenOf(r);
      return `  realm ${r}  cultivator ${power(s).toFixed(0).padStart(7)}` +
        `   common ${beastPower(commonsOf(r)[0]).toFixed(0).padStart(7)}` +
        `   ${g.han} warden ${beastPower(g).toFixed(0).padStart(8)}` +
        `   odds ${(100 * odds(s, g)).toFixed(0)}%`;
    });
    console.log(`\n${rows.join('\n')}\n`);

    for (let r = 2; r <= 9; r++) {
      expect(beastPower(wardenOf(r))).toBeGreaterThan(beastPower(wardenOf(r - 1)));
    }
  });

  it('spending nothing never beats a warden; spending does', () => {
    for (const r of [2, 4, 6, 8]) expect(odds(bare(r), wardenOf(r))).toBeLessThan(0.15);

    const rows = [2, 4, 6, 8, 9].map((r) => {
      const g = wardenOf(r);
      return `  realm ${r}  ${g.han} warden — spending nothing ${(100 * odds(bare(r), g)).toFixed(0)}%` +
        `   spending 35% ${(100 * odds(invested(r), g)).toFixed(0)}%` +
        `   spending 55% ${(100 * odds(invested(r, 0.55), g)).toFixed(0)}%`;
    });
    console.log(`\n${rows.join('\n')}\n`);

    // The middling player needs a real chance, and the heavier spender has to get through.
    for (const r of [2, 4, 6, 8]) {
      expect(odds(invested(r), wardenOf(r))).toBeGreaterThan(0.2);
      expect(odds(invested(r, 0.55), wardenOf(r))).toBeGreaterThan(0.55);
    }
  });

  it('commons are hunting, not a wall — and three steps, not three identical buttons', () => {
    for (const r of [1, 3, 5, 7, 9]) {
      const s = invested(r);
      const chances = commonsOf(r).map((c) => odds(s, c));
      for (const c of chances) expect(c).toBeGreaterThan(0.45);
      expect(Math.max(...chances) - Math.min(...chances)).toBeGreaterThan(0.1);
    }
    const s = invested(5);
    console.log(`\n  realm 5, the three commons: ${commonsOf(5).map((c) =>
      `${c.han} ${(100 * odds(s, c)).toFixed(0)}%`).join(' · ')}\n`);
  });

  it('the reference grows every realm, and the beasts with it', () => {
    for (let r = 2; r <= 9; r++) {
      expect(referencePower(r)).toBeGreaterThan(referencePower(r - 1));
    }
  });

  it('a fight resolves, is deterministic, and never hangs', () => {
    const s = bare(3);
    const b = commonsOf(3)[0];
    const a = fight(s, b, 42);
    const c = fight(s, b, 42);
    expect(a.rounds.length).toBeGreaterThan(0);
    expect(a.rounds.length).toBeLessThanOrEqual(24);
    expect(a.won).toBe(c.won);
    expect(a.rounds.length).toBe(c.rounds.length);
  });

  it('every beast has an icon, a unique key and a real realm', () => {
    expect(new Set(BEASTS.map((b) => b.key)).size).toBe(BEASTS.length);
    expect(BEASTS.length).toBe(36);
    for (const b of BEASTS) {
      expect(b.realm).toBeGreaterThanOrEqual(1);
      expect(b.realm).toBeLessThanOrEqual(9);
      expect(b.icon.length).toBeGreaterThan(0);
    }
    for (let r = 1; r <= 9; r++) expect(commonsOf(r).length).toBe(3);
  });
});
