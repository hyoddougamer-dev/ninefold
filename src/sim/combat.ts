import { commonsOf, type Beast, wardenOf } from '../data/bestiary.ts';
import { LAYERS_PER_REALM, REALM_COST } from './balance.ts';
import { UPGRADE_INFO, power, type State } from './state.ts';
import { beastWeakness } from './dao.ts';

/**
 * 戰 Automatic combat, watched.
 *
 * It resolves on its own over a handful of rounds — the screen draws the bars falling —
 * and the player chooses nothing. It is the only moment in the game that is not a bar
 * filling, and it is what gives technique, pills, method and cores a reason to exist.
 *
 * Losing costs nothing: you come back when you have more power. That is why the whole
 * result can be computed at once and only then animated.
 */

/**
 * 基準 The reference power at the top of a realm.
 *
 * Beasts have no curve of their own: they are tuned against *this*. The reference is a
 * cultivator who reached the realm's ceiling and put a fixed share of all the qi they
 * ever earned into 劍訣 technique — not the player who spent nothing, not the one who
 * optimised everything, but the one in the middle.
 *
 * The first version gave beasts an exponent of their own (1.42 per layer) and they ran
 * away from any possible player: at realm 4 the warden was worth twenty well-invested
 * cultivators. Deriving from the curve instead of inventing a number means the balance
 * follows on its own when REALM_COST changes.
 */
export const POWER_SHARE = 0.35;

export function referencePower(realm: number): number {
  const r = Math.max(1, Math.min(9, realm));
  let totalQi = 0;
  for (let i = 0; i < r; i++) {
    const c = REALM_COST[i];
    if (Number.isFinite(c)) totalQi += c;
  }
  const { base, step, gain } = UPGRADE_INFO.technique;
  const spent = totalQi * POWER_SHARE;
  // Geometric sum, inverted: how many levels that spend buys.
  const levels = Math.log1p((spent * (step - 1)) / base) / Math.log(step);
  // The ninth realm is the ceiling and its layers never open, so the ladder stops at
  // the 73rd — which is where the cultivator actually stands for good.
  const top = 8 * LAYERS_PER_REALM + 1;
  const ladder = Math.min((r - 1) * LAYERS_PER_REALM + LAYERS_PER_REALM, top);
  return ladder * gain ** levels;
}

/**
 * The share of the reference each step of a realm occupies. The three commons of a
 * realm have to be an easy one, a middling one and a hard one — the first version
 * indexed by *realm* rather than by beast, and all three came out with the same power
 * and the same odds, which turns three distinct animals into three identical buttons.
 */
const STEPS = [0.45, 0.62, 0.84];

/** A beast's power, always as a fraction of its realm's reference. */
export function beastPower(b: Beast): number {
  const ref = referencePower(b.realm);
  if (b.warden) return ref * 1.15;            // the warden asks for a little above the middle
  const i = commonsOf(b.realm).findIndex((x) => x.key === b.key);
  return ref * STEPS[Math.max(0, i) % STEPS.length];
}

export interface Round {
  readonly playerHealth: number;   // 0..1
  readonly beastHealth: number;    // 0..1
  readonly playerDamage: number;
  readonly beastDamage: number;
}

export interface Outcome {
  readonly won: boolean;
  readonly rounds: readonly Round[];
  readonly playerPower: number;
  readonly beastPower: number;
}

/** Deterministic noise: the same fight at the same instant gives the same result. */
function dice(seed: number): () => number {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function fight(s: State, b: Beast, seed: number): Outcome {
  const pp = power(s);
  const bp = effectiveBeastPower(s, b);
  let ph = pp * 10;
  let bh = bp * 10;
  const ph0 = ph;
  const bh0 = bh;

  const d = dice(seed);
  const rounds: Round[] = [];

  // A round cap so a theoretical draw never hangs anything: whoever is ahead wins.
  for (let i = 0; i < 24 && ph > 0 && bh > 0; i++) {
    const pd = pp * (0.82 + d() * 0.46);
    const bd = bp * (0.82 + d() * 0.46);
    bh -= pd;
    ph -= bd;
    rounds.push({
      playerHealth: Math.max(0, ph / ph0),
      beastHealth: Math.max(0, bh / bh0),
      playerDamage: pd,
      beastDamage: bd,
    });
  }

  return { won: bh <= 0 || ph / ph0 > bh / bh0, rounds, playerPower: pp, beastPower: bp };
}

/** How much material a common beast drops. */
export function loot(b: Beast): number {
  return Math.max(1, Math.round(b.realm * 1.6 + (b.realm - 1) ** 1.5));
}

/** An honest reading of the odds, so the screen can warn before you go in. */
export function odds(s: State, b: Beast): number {
  const r = power(s) / effectiveBeastPower(s, b);
  return Math.max(0.02, Math.min(0.98, 1 / (1 + Math.exp(-(r - 1) * 4))));
}

/** A beast's power as this cultivator meets it — 破甲 Sunder shaves it down. */
export function effectiveBeastPower(s: State, b: Beast): number {
  return beastPower(b) * beastWeakness(s.unlocked);
}

export function currentWarden(s: State): Beast {
  return wardenOf(s.realm);
}
