/**
 * 簡 A path's numbers, to one decimal place in a 512 box.
 *
 * The icons were written to three decimals, a thousandth of a unit in a box drawn at 24
 * to 64 pixels: invisible, and a fifth of the icon table's weight. Paths with an arc are
 * left alone, because an arc's two flags may be written run together ("011") and no
 * tokenizer can tell those from a number without knowing the command.
 */
export function roundPath(d: string, places = 1): string {
  if (/[aA]/.test(d)) return d;
  const tokens = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) ?? [];
  const k = 10 ** places;
  let out = '';
  let prev: string | null = null;
  for (const t of tokens) {
    if (/^[a-zA-Z]$/.test(t)) { out += t; prev = null; continue; }
    let s = String(Math.round(Number(t) * k) / k);
    if (s === '-0') s = '0';
    s = s.replace(/^(-?)0\./, '$1.');
    // A number needs a space before it unless its own sign or point already separates it.
    if (prev !== null && !s.startsWith('-') && !(s.startsWith('.') && prev.includes('.'))) out += ' ';
    out += s;
    prev = s;
  }
  return out;
}

/** Every `d="…"` in a piece of SVG, rounded. */
export function roundSvg(svg: string, places = 1): string {
  return svg.replace(/d="([^"]*)"/g, (_, d: string) => `d="${roundPath(d, places)}"`);
}
