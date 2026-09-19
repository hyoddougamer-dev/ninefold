import { LAYERS_PER_REALM, REALM_COST } from './balance.ts';
import { BEASTS } from '../data/bestiary.ts';

/** The four things qi is spent on. All of them multiply; none of them is ever lost. */
export type Upgrade = 'technique' | 'method' | 'pills' | 'cores';

export const UPGRADES: readonly Upgrade[] = ['technique', 'method', 'pills', 'cores'];

export const UPGRADE_INFO: Record<Upgrade, {
  han: string; name: string; icon: string; effect: string;
  base: number; step: number; gain: number; affects: 'rate' | 'power';
  currency: 'qi' | 'material';
}> = {
  technique: { han: '劍訣', name: 'Sword Technique', icon: 'katana',
    effect: '+18% power', base: 60, step: 1.16, gain: 1.18, affects: 'power', currency: 'qi' },
  method: { han: '功法', name: 'Cultivation Method', icon: 'scroll-unfurled',
    effect: '+15% qi per second', base: 100, step: 1.19, gain: 1.15, affects: 'rate', currency: 'qi' },
  pills: { han: '丹藥', name: 'Pills', icon: 'fire-gem',
    effect: '+10% qi per second', base: 45, step: 1.14, gain: 1.10, affects: 'rate', currency: 'qi' },
  cores: { han: '妖丹', name: 'Beast Cores', icon: 'crystal-cluster',
    effect: '+12% power', base: 3, step: 1.22, gain: 1.12, affects: 'power', currency: 'material' },
};

export interface State {
  readonly v: 1;
  /** Epoch seconds this state is correct as of. */
  at: number;
  startedAt: number;
  realm: number;   // 1..9
  layer: number;   // 0..8 layers opened in the current realm
  qi: number;
  materials: number;
  /** Has the current realm's warden fallen? Until it has, there is no breakthrough. */
  wardenFell: boolean;
  levels: Record<Upgrade, number>;
  killed: Record<string, number>;
}

export function newState(now: number): State {
  return {
    v: 1, at: now, startedAt: now,
    realm: 1, layer: 0, qi: 0, materials: 0, wardenFell: false,
    levels: { technique: 0, method: 0, pills: 0, cores: 0 },
    killed: {},
  };
}

export function upgradeCost(s: State, u: Upgrade): number {
  const i = UPGRADE_INFO[u];
  return Math.ceil(i.base * i.step ** s.levels[u]);
}

export function canBuy(s: State, u: Upgrade): boolean {
  const i = UPGRADE_INFO[u];
  const cost = upgradeCost(s, u);
  return i.currency === 'qi' ? s.qi >= cost : s.materials >= cost;
}

export function buy(s: State, u: Upgrade): State {
  if (!canBuy(s, u)) return s;
  const i = UPGRADE_INFO[u];
  const cost = upgradeCost(s, u);
  return {
    ...s,
    qi: i.currency === 'qi' ? s.qi - cost : s.qi,
    materials: i.currency === 'material' ? s.materials - cost : s.materials,
    levels: { ...s.levels, [u]: s.levels[u] + 1 },
  };
}

/** Qi rate multiplier coming from upgrades. */
export function rateBonus(s: State): number {
  return UPGRADE_INFO.method.gain ** s.levels.method
    * UPGRADE_INFO.pills.gain ** s.levels.pills;
}

/** 力 Combat power. It decides every beast, and only upgrades and the ladder move it. */
export function power(s: State): number {
  const ladder = (s.realm - 1) * LAYERS_PER_REALM + s.layer + 1;
  return ladder * UPGRADE_INFO.technique.gain ** s.levels.technique
    * UPGRADE_INFO.cores.gain ** s.levels.cores;
}

/** The realm is full and only the warden is left? */
export function atCeiling(s: State): boolean {
  return s.layer >= LAYERS_PER_REALM - 1
    && s.qi >= REALM_COST[s.realm - 1] / LAYERS_PER_REALM
    && Number.isFinite(REALM_COST[s.realm - 1]);
}

export function canBreakThrough(s: State): boolean {
  return atCeiling(s) && s.wardenFell && s.realm < 9;
}

export function breakThrough(s: State): State {
  if (!canBreakThrough(s)) return s;
  return { ...s, realm: s.realm + 1, layer: 0, qi: 0, wardenFell: false };
}

/**
 * A save is input, and it is validated like any other input.
 *
 * The earlier build shipped without this and had a hole where a hand-edited heirloom
 * multiplied the qi rate by 196,502x and passed every check. The qi ceiling below is
 * what closes that hole: nothing may hold more qi than the fastest conceivable
 * cultivator could have gathered in the wall-clock time since the run began.
 */
export function validate(raw: unknown, now: number): State {
  const o = (raw ?? {}) as Record<string, unknown>;
  if (o.v !== 1) return newState(now);

  const num = (x: unknown, fallback: number) =>
    typeof x === 'number' && Number.isFinite(x) ? x : fallback;
  const clamp = (x: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, x));

  const startedAt = clamp(num(o.startedAt, now), 0, now);
  const realm = clamp(Math.floor(num(o.realm, 1)), 1, 9);
  const layer = clamp(Math.floor(num(o.layer, 0)), 0, LAYERS_PER_REALM - 1);

  const rawLevels = (o.levels ?? {}) as Record<string, unknown>;
  const levels = Object.fromEntries(
    UPGRADES.map((u) => [u, clamp(Math.floor(num(rawLevels[u], 0)), 0, 999)]),
  ) as Record<Upgrade, number>;

  const rawKilled = (o.killed ?? {}) as Record<string, unknown>;
  const killed: Record<string, number> = {};
  for (const [k, v] of Object.entries(rawKilled)) {
    if (!BEASTS.some((x) => x.key === k)) continue;   // a beast that does not exist is not a kill
    const n = Math.floor(num(v, 0));
    if (n > 0) killed[k] = n;
  }

  // The ceiling: the whole ladder, every plausible upgrade, times the elapsed time.
  const elapsed = Math.max(0, now - startedAt);
  const qiCeiling = 1.02 ** 81 * 1.15 ** 200 * 1.10 ** 200 * elapsed + 1e6;

  return {
    v: 1,
    startedAt,
    at: clamp(num(o.at, now), startedAt, now),
    realm,
    layer,
    qi: clamp(num(o.qi, 0), 0, qiCeiling),
    materials: clamp(num(o.materials, 0), 0, 1e12),
    wardenFell: o.wardenFell === true,
    levels,
    killed,
  };
}
