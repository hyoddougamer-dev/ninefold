import { isElite, type Beast } from '../data/bestiary.ts';
import {
  ELITE_EDGE, ELITE_ESSENCE, ELITE_RISEN_FROM, GATE_EDGE, PLATFORM_EDGE, PLATFORM_EDGE_GROWTH, PLATFORM_REALM,
} from './balance.ts';
import type { State } from './state.ts';

/**
 * 升 The risen elite, and 精血 the Essence Blood it leaves: the small facts every other file
 * reads, kept apart from the fight so that sim/combat.ts can ask them without a cycle. The
 * fight, the odds and the kill are in sim/elite.ts.
 *
 * 律 The rules:
 *
 *   量 From ELITE_RISEN_FROM, the elite of the realm the cultivator stands in is measured
 *     against their own 力 (ELITE_EDGE), thinned like any beast. It is never a wall that
 *     power alone climbs over, and never one that power alone cannot.
 *   定 Its dice are set for the day, and a loss holds for the day: once lost, the realm's
 *     risen elite cannot be fought again until the next UTC day (State.eliteLost). Nothing
 *     the hand can change (stance, arts, what is carried) buys another roll the same day,
 *     and a loss still costs nothing.
 *   手 While risen it is never driven and never on Auto. Left behind, it goes back to its
 *     fixed wall (ELITE_WALL) and is a hunt like any other.
 *   血 Every elite felled from ELITE_RISEN_FROM leaves ELITE_ESSENCE of its realm's blood,
 *     which the realm's elixirs, sigils and Breakthrough Pills ask for.
 */

/** 升 Whether this beast is the risen elite for this cultivator: the elite of their own realm, from ELITE_RISEN_FROM. */
export function risenElite(s: Pick<State, 'realm'>, b: Beast): boolean {
  return b.realm >= ELITE_RISEN_FROM && b.realm === s.realm && isElite(b);
}

/**
 * 擂 The Platform's second challenger's edge in a realm (platformEdge(1, realm) in
 * sim/platform.ts, which cannot be imported here without a cycle): the measure the risen
 * elite and the risen gate stand on, so the three hard fights of a realm keep one scale.
 */
function secondEdge(realm: number): number {
  return PLATFORM_EDGE[1] * (1 + PLATFORM_EDGE_GROWTH * Math.max(0, Math.min(9, realm) - PLATFORM_REALM));
}

/**
 * 升 Where a risen elite of this realm stands, as a multiple of the cultivator's own 力:
 * the Platform's second challenger, ELITE_EDGE above it. Zero below ELITE_RISEN_FROM.
 */
export function eliteEdge(realm: number): number {
  const e = ELITE_EDGE[Math.max(1, Math.min(9, realm)) - 1] ?? 0;
  return e > 0 ? e * secondEdge(realm) : 0;
}

/**
 * 關 Where the vault's last gate stands at least, as a multiple of the walker's own 力: the
 * Platform's second challenger at GATE_EDGE of itself. Zero below ELITE_RISEN_FROM.
 */
export function gateEdge(realm: number): number {
  const e = GATE_EDGE[Math.max(1, Math.min(9, realm)) - 1] ?? 0;
  return e > 0 ? e * secondEdge(realm) : 0;
}

/** 日 The whole UTC day a moment falls in. */
export const dayOf = (at: number): number => Math.floor(at / 86_400);

function hash(n: number): number {
  let x = (n ^ 0x27d4eb2d) >>> 0;
  x = Math.imul(x ^ (x >>> 16), 0x85ebca6b) >>> 0;
  x = Math.imul(x ^ (x >>> 13), 0xc2b2ae35) >>> 0;
  return (x ^ (x >>> 16)) >>> 0;
}

/**
 * 定 The day's dice for a risen elite: the run, the wins over it so far, the realm and the
 * day. A loss holds for the day (eliteHeld), so what the hand changes cannot re-roll it.
 */
export function eliteSeed(s: Pick<State, 'startedAt' | 'killed' | 'realm' | 'at'>, b: Beast): number {
  const wins = s.killed[b.key] ?? 0;
  return hash((s.startedAt >>> 0) ^ Math.imul(wins + 1, 2654435761) ^ Math.imul(s.realm, 40503)
    ^ Math.imul(dayOf(s.at) + 7, 0x9e3779b1));
}

/** 定 Whether this risen elite was lost today: it is set until the next UTC day. */
export function eliteHeld(s: Pick<State, 'realm' | 'at' | 'eliteLost'>, b: Beast): boolean {
  return risenElite(s, b) && s.eliteLost?.[String(b.realm)] === dayOf(s.at);
}

/** 定 A risen elite lost: its realm is set for the rest of this UTC day. Nothing else changes. */
export function loseElite<T extends Pick<State, 'realm' | 'at' | 'eliteLost'>>(s: T, b: Beast): T {
  if (!risenElite(s, b)) return s;
  return { ...s, eliteLost: { ...(s.eliteLost ?? {}), [String(b.realm)]: dayOf(s.at) } };
}

/* ── 精血 Essence Blood ──────────────────────────────────────────────────── */

/** 精血 The key a recipe names a realm's Essence Blood by, beside its herbs and parts. */
export const essenceKey = (realm: number): string => `essence:${realm}`;

/** 精血 The realm a need's key names, or null when it is not blood. */
export function essenceRealm(key: string): number | null {
  const m = /^essence:(\d)$/.exec(key);
  return m ? Number(m[1]) : null;
}

/** 精血 How much of a realm's blood this cultivator holds. */
export function essenceOf(s: Pick<State, 'essence'>, realm: number): number {
  return Math.max(0, Math.floor(s.essence?.[String(realm)] ?? 0));
}

/** 精血 Blood added (or, negative, spent): never below nothing. */
export function addEssence<T extends Pick<State, 'essence'>>(s: T, realm: number, n: number): T {
  const v = essenceOf(s, realm) + Math.floor(n);
  const next: Record<string, number> = { ...(s.essence ?? {}) };
  if (v > 0) next[String(realm)] = v; else delete next[String(realm)];
  return { ...s, essence: next };
}

/** 精血 What felling this beast leaves of its realm's blood: ELITE_ESSENCE for an elite from ELITE_RISEN_FROM. */
export function essenceFrom(b: Beast): number {
  return isElite(b) && b.realm >= ELITE_RISEN_FROM ? ELITE_ESSENCE : 0;
}
