/**
 * 閒 Where a realm's qi actually goes, and how long the bar stands still.
 *
 * It lives here rather than in a test because two things read it — `idle.test.ts`, which
 * keeps the numbers from drifting and prints them on every run, and `bible.ts`, which
 * puts the same table on the page.
 *
 * It exists because of a claim that felt true and was not. Bruno, on the early game:
 * *"hoje os quatro upgrades enchem-se em ~9 horas e depois a barra só enche"*, and the
 * answer that suggested itself was to give the first three realms something more to
 * spend qi on. Measured, that would have been wasted work:
 *
 *   - Every realm's eighteen qi levels cost 150–156% of that realm's own ladder. The
 *     first realm is not an outlier by a single point.
 *   - The four boxes are full at most 4–14% of a realm, and only in the stretch right
 *     before the warden.
 *   - 44–62% of a checking-in cultivator's qi goes into upgrades, not into the bar.
 *
 * What the measurement did find is a different thing in the same place, and it is the
 * one worth knowing: **the ceiling wait**. A realm's bar stops at its ninth rung and qi
 * banks until the warden falls, and for the lightest cultivator that is three quarters
 * of the first realm. See the table this prints.
 *
 * And the mechanism behind both is one line of `advance`: **a layer opens by itself the
 * moment the qi reaches its price, and the qi is set to zero.** Nobody chooses. A
 * cultivator who visits once a day has the ladder take the qi five or ten times between
 * visits and arrives holding a fraction of a rung; one who visits six times intercepts
 * far more of it. That is not a bug to be fixed — it is the largest single reason
 * playing beats waiting in this game, and it is measured here so it stops being
 * rediscovered.
 */
import {
  UPGRADES, UPGRADE_INFO, atCeiling, breakThrough, buy, canBreakThrough, canBuy, canFightWarden,
  canCondense, capOf, condense, newState, upgradeCost, type State,
} from '../src/sim/state.ts';
import { advance, layersOpened, rate } from '../src/sim/time.ts';
import { odds, takeKill } from '../src/sim/combat.ts';
import { huntable, wardenOf } from '../src/data/bestiary.ts';
import { isOpen } from '../src/sim/unlocks.ts';
import { LAYERS, LAYERS_PER_REALM, LEVELS_PER_REALM, ladderAt } from '../src/sim/balance.ts';

const T0 = 1_700_000_000;
/** Ten minutes. Fine enough to see a first-realm rung open, cheap enough to run often. */
const SAMPLE = 600;
/** The three the qi actually buys. 妖丹 is bought with 材 and is not part of this. */
const QI_UPGRADES = ['technique', 'method', 'pills'] as const;

export interface Realm {
  readonly realm: number;
  /** Hours the cultivator spent in it. */
  readonly hours: number;
  /** Share of the qi gathered there that went into upgrades rather than into the bar. */
  readonly intoUpgrades: number;
  /** Hours stood at the ceiling with the bar full and the warden still alive. */
  readonly ceilingHours: number;
  /** Hours with the bar full at all — warden alive or the toll not yet re-earned. */
  readonly stuckHours: number;
  /** Share of the realm's whole qi income that piled up at that ceiling. */
  readonly ceilingQi: number;
  /** Hours with every qi upgrade already at the realm's cap. */
  readonly cappedHours: number;
  /** 材 earned by hunting in this realm… */
  readonly materialEarned: number;
  /** …and how much of it 妖丹 was ever able to take. */
  readonly materialSpent: number;
  /** Share of the realm spent with 妖丹 at its cap, so material bought nothing at all. */
  readonly deadMaterial: number;
}

export interface Idle {
  readonly name: string;
  readonly checks: number;
  readonly rows: readonly Realm[];
}

/** A cultivator who checks in `checks` times a day, buys what they can and hunts a little. */
export function walk(name: string, checks: number, hunts: number, maxDays = 260): Idle {
  let s: State = newState(T0);
  let t = T0;
  const hours = new Array(10).fill(0);
  const capped = new Array(10).fill(0);
  const ceiling = new Array(10).fill(0);
  const stuck = new Array(10).fill(0);
  const ceilingQi = new Array(10).fill(0);
  const spent = new Array(10).fill(0);
  const income = new Array(10).fill(0);
  const matEarned = new Array(10).fill(0);
  const matSpent = new Array(10).fill(0);
  const matDead = new Array(10).fill(0);
  const visit = 86_400 / checks;
  let nextVisit = T0;

  while (layersOpened(s) < LAYERS - 1 && (t - T0) / 86_400 < maxDays) {
    // The rate is read before the step so the qi is credited to the realm that earned it.
    const earned = rate(s) * SAMPLE;
    t += SAMPLE;
    s = advance(s, t);
    income[s.realm] += earned;

    if (t >= nextVisit) {
      nextVisit += visit;
      for (let g = 0; g < 200; g++) {
        const open = UPGRADES.filter((u) => canBuy(s, u) && (u !== 'cores' || isOpen(s.realm, 'cores')));
        if (!open.length) break;
        open.sort((a, b) => upgradeCost(s, a) - upgradeCost(s, b));
        const pick = open[0];
        if (UPGRADE_INFO[pick].currency === 'qi') spent[s.realm] += upgradeCost(s, pick);
        else matSpent[s.realm] += upgradeCost(s, pick);
        s = buy(s, pick);
      }
      for (let i = 0; i < hunts; i++) {
        const b = [...huntable(s.realm, s.layer)].reverse().find((x) => odds(s, x) > 0.7);
        if (!b) break;
        const before = s.materials;
        s = takeKill(s, b);
        matEarned[s.realm] += Math.max(0, s.materials - before);
      }
      if (canFightWarden(s)) {
        for (let i = 0; i < 40; i++) {
          if (odds(s, wardenOf(s.realm)) > 0.5 || !canCondense(s)) break;
          s = condense(s);
        }
      }
      if (canFightWarden(s) && odds(s, wardenOf(s.realm)) > 0.25) s = takeKill(s, wardenOf(s.realm));
      if (canBreakThrough(s)) s = breakThrough(s);
    }

    hours[s.realm] += SAMPLE;
    if (QI_UPGRADES.every((u) => s.levels[u] >= capOf(s, u))) capped[s.realm] += SAMPLE;
    // 丹 The one stretch where the hunting pays a coin with nothing behind it.
    if (s.levels.cores >= capOf(s, 'cores')) matDead[s.realm] += SAMPLE;
    // 頂 The bar has stopped and the warden still stands: the one stretch of a realm
    // where gathered qi has nowhere at all to go.
    if (atCeiling(s)) {
      stuck[s.realm] += SAMPLE;
      if (!s.wardenFell) { ceiling[s.realm] += SAMPLE; ceilingQi[s.realm] += earned; }
    }
  }

  const rows: Realm[] = [];
  for (let realm = 1; realm <= 9; realm++) {
    if (!hours[realm]) continue;
    rows.push({
      realm,
      hours: hours[realm] / 3600,
      intoUpgrades: spent[realm] / Math.max(1, income[realm]),
      ceilingHours: ceiling[realm] / 3600,
      stuckHours: stuck[realm] / 3600,
      ceilingQi: ceilingQi[realm] / Math.max(1, income[realm]),
      cappedHours: capped[realm] / 3600,
      materialEarned: matEarned[realm],
      materialSpent: matSpent[realm],
      deadMaterial: matDead[realm] / Math.max(1, hours[realm]),
    });
  }
  return { name, checks, rows };
}

/** The three cultivators this question is worth asking of. */
export const IDLERS: readonly { name: string; checks: number; hunts: number }[] = [
  { name: 'once a day', checks: 1, hunts: 4 },
  { name: 'casual', checks: 3, hunts: 3 },
  { name: 'active', checks: 6, hunts: 6 },
  // 打 Somebody who actually taps. The three above hunt like a model of restraint, and
  // Bruno does not: *"dei max em todos os monstros disponíveis e vou a meio do realm."*
  // A cultivator who presses the button sixty times a visit is the one who finds the
  // end of what a realm has, and 材 is the currency that ends first.
  { name: 'taps it out', checks: 6, hunts: 60 },
];

export function walkAll(): readonly Idle[] {
  return IDLERS.map((h) => walk(h.name, h.checks, h.hunts));
}

/**
 * 分 What a realm lets you buy, against what the realm itself costs.
 *
 * This is the number that killed the "the first realms have nothing to spend on" theory
 * outright: it is the same in every realm, to within six points.
 */
export function allowedShare(realm: number): number {
  let ladder = 0;
  for (let i = 0; i < LAYERS_PER_REALM; i++) ladder += ladderAt((realm - 1) * LAYERS_PER_REALM + i);
  let levels = 0;
  for (const u of QI_UPGRADES) {
    for (let level = (realm - 1) * LEVELS_PER_REALM; level < realm * LEVELS_PER_REALM; level++) {
      const s = { ...newState(0), realm, levels: { technique: level, method: level, pills: level, cores: 0 } } as State;
      levels += upgradeCost(s, u);
    }
  }
  return levels / ladder;
}
