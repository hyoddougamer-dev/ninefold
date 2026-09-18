/**
 * 色 The palette, and the only one. The previous build failed on inconsistent art, so
 * no colour is ever written as a literal outside this file — a mark that needs a new
 * colour is a mark that needs a reason.
 *
 * The ground is lacquer, near-black with green in it. There is no white anywhere in the
 * game: every asset is judged composited on the lacquer, never on a blank page.
 */
export const LACQUER = '#060F0C';
export const LACQUER_HI = '#0B1A15';

/** Chrome, value, danger. Three, and no more. */
export const JADE = '#4ECFA3';
export const GOLD = '#D9AE4E';
export const CINNABAR = '#C8442C';

/** Neutrals are drawn from the ground, green-biased, never pure grey. */
export const INK = '#0A1512';
export const SMOKE = '#2A3A34';
export const BONE = '#C3D2C9';

/**
 * 五行 The five phases. Altitude walks through them, so a screenshot of the foot of the
 * mountain and one of the shoulder are different worlds without any asset changing.
 */
export type Phase = 'wood' | 'fire' | 'earth' | 'metal' | 'water';

export const PHASE_ORDER: readonly Phase[] = ['wood', 'fire', 'earth', 'metal', 'water'];

export const PHASE_LIGHT: Record<Phase, string> = {
  wood: '#8FD9A0', fire: '#F0906A', earth: '#F2CE72', metal: '#DCE6EE', water: '#8FB4F0',
};

export const PHASE_DEEP: Record<Phase, string> = {
  wood: '#22523A', fire: '#6E2A20', earth: '#6B5020', metal: '#3E4E5C', water: '#1E3468',
};

export function mix(a: string, b: string, k: number): string {
  const t = Math.max(0, Math.min(1, k));
  const v = (s: string, i: number) => parseInt(s.replace('#', '').slice(i, i + 2), 16);
  const ch = (i: number) => Math.round(v(a, i) * (1 - t) + v(b, i) * t);
  return `#${[0, 2, 4].map((i) => ch(i).toString(16).padStart(2, '0')).join('')}`;
}

/** Fade a hex toward the lacquer rather than toward transparency, so depth stays warm. */
export function recede(c: string, k: number): string {
  return mix(c, LACQUER, k);
}
