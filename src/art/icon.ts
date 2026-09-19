import { ICONS } from './icons.generated.ts';

/**
 * One icon from the library, ready for CSS to colour.
 *
 * Each icon ships as a white silhouette on a black square; the square is already gone
 * by generation time, and `fill="currentColor"` here is what lets the same file serve
 * any palette. That is why nine realms did not cost nine drawings.
 */
export function icon(name: string, size = 24): string {
  const body = ICONS[name];
  if (!body) return '';
  return `<svg viewBox="0 0 512 512" width="${size}" height="${size}" fill="currentColor" aria-hidden="true">${body}</svg>`;
}

export function hasIcon(name: string): boolean {
  return name in ICONS;
}
