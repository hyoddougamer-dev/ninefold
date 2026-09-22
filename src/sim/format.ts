/**
 * The suffixes, in order of a thousand.
 *
 * It goes a long way past the ninth realm on purpose. 渡劫 has no top: every thunder
 * mark multiplies the qi rate, so a cultivator who keeps crossing leaves the last
 * suffix behind eventually. Before this list existed the screen printed
 * "146419072126555360T", which is not a number anybody reads.
 */
const SUFFIX = ['', 'k', 'M', 'B', 'T', 'Qa', 'Qn', 'Sx', 'Sp', 'Oc', 'No', 'Dc',
  'UDc', 'DDc', 'TDc', 'QaDc', 'QnDc', 'SxDc', 'SpDc', 'ODc', 'NDc', 'Vg'];

/**
 * Quintillion is 'Qn', not the usual 'Qi'.
 *
 * The endgame reaches it: a cultivator holding twelve marks reads 2.67 of them, and
 * the screen prints it two lines above "+78.2B qi / s". A currency called qi and a
 * suffix called Qi in the same glance is the one collision this game could not afford.
 */

/** Numbers a player reads at a glance, not numbers an accountant prints. */
export function num(n: number): string {
  if (!Number.isFinite(n)) return '∞';
  const abs = Math.abs(n);
  if (abs < 100) return Number(n.toFixed(1)).toString();
  if (abs < 1e4) return Math.round(n).toString();

  const step = Math.min(SUFFIX.length - 1, Math.floor(Math.log10(abs) / 3));
  const v = n / 1000 ** step;
  // Past the last suffix there is nothing left to name it with, so it goes exponential
  // rather than lying about the size.
  if (abs >= 1000 ** SUFFIX.length) return n.toExponential(2).replace('e+', 'e');
  return `${Math.abs(v) >= 100 ? Math.round(v) : Number(v.toFixed(Math.abs(v) >= 10 ? 1 : 2))}${SUFFIX[step]}`;
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
