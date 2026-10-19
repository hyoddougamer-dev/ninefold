/**
 * 傳說 The legendary works and 擊 the hard wins that strike them, as the simulation sees them.
 *
 * Bruno, 2026-10-18: *"I want content and loops so the player always has something to do:
 * crafts almost unreachable that take enormous amounts of materials, or very rare drop
 * items. I want difficulty and a complete loop. I do not want players time-gated just
 * because, forced to wait."*
 *
 * So each craft has one work past its last recipe (data/crafts.ts LEGENDS). It asks for the
 * craft mastered, heaps of the late realms' material and 精魄 Elite Souls, which only a win
 * over one's own realm's elite leaves. Begun, its materials go onto the anvil and it is a
 * forging of days. A hard win (the realm's elite, a gate in the vault) strikes it shorter,
 * and while a warden stands at the realm's gate the same win counts as time waited there.
 * The loop closes on itself: the elite is the hardest hunt in a realm, the works it pays for
 * make the hunter stronger, and the stronger hunter beats the next realm's elite sooner.
 *
 * 律 Pure, like all of sim/. A soul is read off the run and the kill's count, never rolled
 * on a clock. Nothing here raises the qi rate, and nothing is ever taken away: a work in
 * progress is kept to the second however long the player is away, and a loss strikes nothing
 * and costs nothing.
 */
import {
  GATE_STRIKE_ELITE, GATE_STRIKE_SHARE, LEGEND_FIGHT_SHARE, LEGEND_MASTERED, LEGEND_POWER,
  LEGEND_SOUL_EVERY, LEGEND_SPEED, LEGEND_STRIKE_ELITE, LEGEND_STRIKE_GATE,
} from './balance.ts';
import {
  LEGENDS, RECIPE_BY_KEY, SKILL_KEYS, legendKey, type Recipe, type SkillKey,
} from '../data/crafts.ts';
import { isElite, type Beast } from '../data/bestiary.ts';
import type { State } from './state.ts';

/** 傳說 The work on the anvil: which, and how far, in seconds of the forging it needs. */
export interface LegendWork {
  readonly key: string;
  /** Seconds the workshop has spent on it. */
  readonly done: number;
  /** Seconds hard wins have struck off it, up to LEGEND_FIGHT_SHARE of the whole. */
  readonly struck: number;
}

/** 傳說 Whether a recipe is a legendary work. */
export const isLegend = (r: Recipe | undefined): boolean => r?.makes.kind === 'legend';

/** 傳說 Whether this cultivator has made the work of a craft. */
export function legendMade(made: Readonly<Record<string, number>>, skill: SkillKey): boolean {
  return (made[legendKey(skill)] ?? 0) > 0;
}

/** 傳說 How many works this cultivator has made, of seven. */
export function legendsMade(made: Readonly<Record<string, number>>): number {
  return SKILL_KEYS.filter((k) => legendMade(made, k)).length;
}

/** 傳說 What the works made multiply power by: LEGEND_POWER each, multiplied. */
export function legendPower(made: Readonly<Record<string, number>>): number {
  return (1 + LEGEND_POWER) ** legendsMade(made);
}

/** 傳說 How much faster a craft is for its own work having been made. */
export function legendSpeed(made: Readonly<Record<string, number>>, skill: SkillKey): number {
  return legendMade(made, skill) ? LEGEND_SPEED : 0;
}

/** 傳說 The seconds a work needs in all, before any strike. */
export function legendNeed(key: string): number {
  return RECIPE_BY_KEY[key]?.seconds ?? Infinity;
}

/** 傳說 The most hard wins may strike off a work. */
export function strikeRoom(key: string): number {
  return LEGEND_FIGHT_SHARE * legendNeed(key);
}

/** 傳說 Seconds of the forging still to go, 0 when it is done. */
export function legendLeft(w: LegendWork): number {
  return Math.max(0, legendNeed(w.key) - w.done - w.struck);
}

/** 傳說 How far through, 0..1, for the bar. */
export function legendShare(w: LegendWork): number {
  const need = legendNeed(w.key);
  return need > 0 && Number.isFinite(need) ? Math.min(1, (w.done + w.struck) / need) : 0;
}

/**
 * 傳說 The work finished: made, off the anvil, and a workshop that was making it standing
 * idle from `at`. Called by whichever came last, the workshop's hours or a strike.
 */
export function finishLegend(s: State, at: number): State {
  const w = s.crafts.legend;
  if (!w || legendLeft(w) > 1e-6) return s;
  const c = s.crafts;
  const making = c.task === w.key;
  return {
    ...s,
    crafts: {
      ...c, legend: null,
      made: { ...c.made, [w.key]: 1 },
      ...(making ? { task: null, since: Math.max(c.since, at) } : {}),
    },
  };
}

/** 擊 Strike the work on the anvil by `seconds`, up to what strikes may take; a finish if it was the last. */
export function strikeLegend(s: State, seconds: number): State {
  const w = s.crafts.legend;
  if (!w || seconds <= 0) return s;
  const room = Math.max(0, strikeRoom(w.key) - w.struck);
  const add = Math.min(room, seconds, legendLeft(w));
  if (add <= 0) return s;
  const next: State = { ...s, crafts: { ...s.crafts, legend: { ...w, struck: w.struck + add } } };
  return finishLegend(next, s.at);
}

/* ── 擊 Hard wins ──────────────────────────────────────────────────────────── */

/** 擊 Whether a beast beaten is a hard win: the elite of the realm one stands in. */
export function hardBeast(s: Pick<State, 'realm'>, b: Beast): boolean {
  return isElite(b) && b.realm === s.realm;
}

/** 精魄 Whether the win that makes `count` kills of this elite leaves a soul: one in LEGEND_SOUL_EVERY, read off the run. */
export function soulOn(startedAt: number, beast: string, count: number): boolean {
  let h = 2166136261 ^ Math.floor(startedAt);
  for (let i = 0; i < beast.length; i++) h = Math.imul(h ^ beast.charCodeAt(i), 16777619);
  h = Math.imul(h ^ count, 2246822507);
  h ^= h >>> 15;
  h = Math.imul(h, 3266489909);
  h ^= h >>> 13;
  return (h >>> 0) % LEGEND_SOUL_EVERY === 0;
}

/**
 * 精魄 A gate beaten in the secret realm leaves a soul one time in LEGEND_SOUL_EVERY too, read
 * off the run's count and the gate's place in it. Everybody walks the secret realm, so this is
 * the way to a work for the cultivator whose build cannot yet beat the elite of the realm it
 * stands in (measured 2026-10-18: the casual crafter beat the ninth realm's elite 0 to 159
 * times in two hundred days and, with the elite alone, never made a work).
 */
export function gateSoul(s: State): State {
  if (!soulOn(s.startedAt, 'secret-realm', s.runs * 64 + s.lastRun.gates)) return s;
  return { ...s, crafts: { ...s.crafts, souls: (s.crafts.souls ?? 0) + 1 } };
}

/**
 * 封 瓶頸 The most hard wins may count as waited at the gate standing now, in seconds:
 * GATE_STRIKE_SHARE of the seal or the wall's loosening, whichever is longer. `wallDays` is
 * passed in (sim/crafts.ts owns it) so this file never reads the wall's curve twice.
 */
export function gateStrikeRoom(s: State, sealDays: number, wallDays: number): number {
  return Math.max(0, GATE_STRIKE_SHARE * Math.max(sealDays, wallDays) * 86_400 - Math.max(0, s.gateStruck ?? 0));
}

/**
 * 擊 A hard win, wherever it was won: the work on the anvil struck, and, for a win over the
 * realm's elite while its warden stands, the gate counted as waited. `gateRoom` is the room
 * the gate has (gateStrikeRoom), 0 when no warden stands. A loss never calls this: losing
 * costs nothing and strikes nothing.
 *
 * 守 A gate in the secret realm strikes the work and never the realm's gate: the secret realm
 * is walked by everyone, the cultivator who never taps a beast included (tools/habits.ts), and
 * counted at the gate it carried them to the ninth realm nine days sooner (121 to 112 at seed
 * 991, measured 2026-10-18), which is the wall between waiting and playing (players.test)
 * coming down for somebody who did not play. The elite is a hunt; the secret realm is a walk.
 */
export function hardWin(s: State, kind: 'elite' | 'gate', gateRoom: number): State {
  let out = strikeLegend(s, kind === 'elite' ? LEGEND_STRIKE_ELITE : LEGEND_STRIKE_GATE);
  const add = kind === 'elite' ? Math.min(gateRoom, GATE_STRIKE_ELITE) : 0;
  if (add > 0) out = { ...out, gateStruck: Math.max(0, out.gateStruck ?? 0) + add };
  return out;
}

/** 傳說 Every work, in the order of the crafts. */
export { LEGENDS, LEGEND_MASTERED };
