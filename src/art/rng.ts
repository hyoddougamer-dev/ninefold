/**
 * Every mark in this game is generated, and every generated mark must be identical on
 * every device and every launch. So there is no Math.random anywhere in `art/` — only
 * these two, seeded from a string that names the thing being drawn.
 */
export function hashString(s: string): number {
  let h = 0x811c9dc5;
  for (let i = 0; i < s.length; i++) {
    h ^= s.charCodeAt(i);
    h = Math.imul(h, 0x01000193) >>> 0;
  }
  return h >>> 0;
}

export function seeded(seed: number | string): () => number {
  let a = (typeof seed === 'string' ? hashString(seed) : seed) >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = a;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** Midpoint displacement across [0,1]. Returns `2^depth + 1` heights, ends pinned. */
export function ridgeline(
  rnd: () => number, depth: number, rough: number, left = 0, right = 0,
): number[] {
  let pts = [left, right];
  let amp = 1;
  for (let d = 0; d < depth; d++) {
    const next: number[] = [];
    for (let i = 0; i < pts.length - 1; i++) {
      next.push(pts[i], (pts[i] + pts[i + 1]) / 2 + (rnd() - 0.5) * amp);
    }
    next.push(pts[pts.length - 1]);
    pts = next;
    amp *= rough;
  }
  return pts;
}
