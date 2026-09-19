import { commonsOf, type Beast, wardenOf } from '../data/bestiary.ts';
import { LAYERS_PER_REALM, REALM_COST } from './balance.ts';
import { UPGRADE_INFO, power, type State } from './state.ts';
import { beastWeakness } from './dao.ts';
import { sequenceOf, stanceOf } from './arts.ts';

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
  /** 訣 The arts that fired this round, in the order the sequence ran them. */
  readonly arts: readonly string[];
  /** True when the beast's blow was turned aside — the screen draws that differently. */
  readonly missed: boolean;
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

/** The most rounds a fight may run, so a theoretical draw can never hang anything. */
export const ROUND_CAP = 24;

/**
 * 氣運 How the qi runs today — one roll for each side, before a blow is thrown.
 *
 * Blow-by-blow noise averages away: ten blows of ±22% come out within 4% of the mean,
 * so whoever had more power won every single time and a fight was decided before it
 * started. The screen hid that behind a sigmoid over the power ratio, which cheerfully
 * promised 34% on fights the player would lose a hundred times out of a hundred.
 *
 * One roll per fight does not average away. It is what makes an underdog worth trying
 * and a favourite worth checking, and it is what the odds on screen are now counting.
 */
export const FORM = 0.2;

/**
 * 戰 The fight, settled in one go.
 *
 * A round is: the cultivator's sequence fires, the cultivator strikes, the beast
 * answers. The stance bends all three; the art on this round's slot bends one of them.
 * The whole thing is pure and seeded, so the same fight always plays out the same way
 * and the screen can replay it at leisure.
 *
 * Order inside a round matters to the player, and so it matters here: 鶴唳 shaves the
 * beast's power *before* the beast answers, which is why taking it early is worth more
 * than taking it late.
 */
export function fight(s: State, b: Beast, seed: number): Outcome {
  const stance = stanceOf(s);
  const sequence = sequenceOf(s);
  const pp = power(s);
  const bp0 = effectiveBeastPower(s, b);

  let beastPower = bp0;      // 纏 and 鶴唳 shave this as the fight runs
  let ph = pp * 10;
  let bh = bp0 * 10;
  const ph0 = ph;
  const bh0 = bh;
  let took = 0;              // what the beast dealt last round, for 傀儡 and 鏡

  const d = dice(seed);
  const myForm = 1 - FORM + d() * FORM * 2;
  const itsForm = 1 - FORM + d() * FORM * 2;
  beastPower *= itsForm;

  // 疾 runs the sequence twice a round, so the cursor is its own counter rather than
  // the round number.
  const perRound = stance?.key === 'swift' ? 2 : 1;
  let cursor = 0;
  const rounds: Round[] = [];

  for (let i = 0; i < ROUND_CAP && ph > 0 && bh > 0; i++) {
    const fired: string[] = [];
    let mine = 0;
    let missed = false;
    let healed = 0;

    for (let k = 0; k < perRound; k++) {
      // The rotation is always SEQUENCE_SLOTS long. An empty slot is a wasted round, so
      // filling the sequence is always worth more than leaving it short.
      const art = sequence[cursor++ % sequence.length];
      // 疾 splits the round into two 60% strikes; everything else is one whole one.
      let blow = pp * myForm * (stance?.key === 'steady' ? 1 : 0.82 + d() * 0.46)
        * (stance?.key === 'swift' ? 0.6 : 1);

      if (stance) {
        if (stance.key === 'guard') blow *= 0.75;
        if (stance.key === 'fierce') blow *= 1.5;
        if (stance.key === 'reckless') blow = d() < 0.5 ? 0 : blow * 3;
        if (stance.key === 'reverse') blow *= 1 + (1 - ph / ph0);
        if (stance.key === 'mirror') blow = Math.max(blow, took);
      }

      if (art) {
        fired.push(art.key);
        switch (art.key) {
          case 'fox': missed = true; break;
          case 'ape': blow *= 1.6; break;
          case 'crane': beastPower *= 0.9; break;
          case 'tiger': blow *= 2; break;
          case 'turtle': healed += ph0 * 0.12; break;
          case 'puppet': blow += took * 0.25; break;
          case 'wolf': blow *= 1 + 0.12 * i; break;
          case 'serpent': if (ph / ph0 < 0.5) blow *= 3; break;
          case 'dragon': blow *= 1.35; missed = true; break;
        }
      }

      mine += blow;
    }

    if (stance?.key === 'entangle') beastPower *= 0.92;
    if (stance?.key === 'endure') healed += ph0 * 0.06;

    bh -= mine;

    let theirs = missed ? 0 : beastPower * (0.82 + d() * 0.46);
    if (stance?.key === 'guard') theirs *= 0.6;
    if (stance?.key === 'fierce') theirs *= 1.5;
    took = theirs;

    ph = Math.min(ph0, ph - theirs + healed);

    rounds.push({
      playerHealth: Math.max(0, ph / ph0),
      beastHealth: Math.max(0, bh / bh0),
      playerDamage: mine,
      beastDamage: theirs,
      arts: fired,
      missed,
    });
  }

  return { won: bh <= 0 || ph / ph0 > bh / bh0, rounds, playerPower: pp, beastPower: bp0 };
}

/** How much material a common beast drops. */
export function loot(b: Beast): number {
  return Math.max(1, Math.round(b.realm * 1.6 + (b.realm - 1) ** 1.5));
}

/** How many fights the odds are read from. Enough to be steady, cheap enough to be free. */
const SAMPLES = 41;

/**
 * 算 An honest reading of the odds.
 *
 * It used to be a curve over the power ratio, which was fine while power was the only
 * thing that decided a fight. A stance that halves what you take and a sequence that
 * triples a strike do not show up in a power ratio at all, so the screen would have
 * promised 40% on a fight the build wins nine times in ten.
 *
 * So it simply *fights* — twenty-five times, on spread seeds — and counts. Pure, cheap,
 * and it can never disagree with what the player is about to watch.
 */
export function odds(s: State, b: Beast): number {
  let won = 0;
  for (let i = 0; i < SAMPLES; i++) {
    if (fight(s, b, (i * 2654435761) >>> 0).won) won++;
  }
  return Math.max(0.02, Math.min(0.98, won / SAMPLES));
}

/** A beast's power as this cultivator meets it — 破甲 Sunder shaves it down. */
export function effectiveBeastPower(s: State, b: Beast): number {
  return beastPower(b) * beastWeakness(s.unlocked);
}

export function currentWarden(s: State): Beast {
  return wardenOf(s.realm);
}
