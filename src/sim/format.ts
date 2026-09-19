/** Numbers a player reads at a glance, not numbers an accountant prints. */
export function num(n: number): string {
  if (!Number.isFinite(n)) return '∞';
  const abs = Math.abs(n);
  const scaled = (v: number, suffix: string) =>
    `${v >= 100 ? Math.round(v) : Number(v.toFixed(v >= 10 ? 1 : 2))}${suffix}`;
  if (abs >= 1e12) return scaled(n / 1e12, 'T');
  if (abs >= 1e9) return scaled(n / 1e9, 'B');
  if (abs >= 1e6) return scaled(n / 1e6, 'M');
  if (abs >= 1e4) return scaled(n / 1e3, 'k');
  if (abs >= 100) return Math.round(n).toString();
  return Number(n.toFixed(1)).toString();
}

export function duration(seconds: number): string {
  if (seconds < 60) return `${Math.round(seconds)}s`;
  if (seconds < 3600) return `${Math.round(seconds / 60)} min`;
  if (seconds < 86_400) {
    const h = Math.floor(seconds / 3600);
    const m = Math.round((seconds % 3600) / 60);
    return m ? `${h}h ${m}min` : `${h}h`;
  }
  const d = Math.floor(seconds / 86_400);
  const h = Math.round((seconds % 86_400) / 3600);
  return h ? `${d}d ${h}h` : `${d}d`;
}
