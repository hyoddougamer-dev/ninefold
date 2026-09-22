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
  /**
   * 進 Round to the smaller unit first, then carry.
   *
   * Rounding each part on its own lets the remainder overflow its unit, and it does:
   * four hours less a few seconds came out of 洞天 the cave as "3h 60min", and a day
   * less a few minutes reads as "1d 24h" the same way. The bug is as old as the
   * function and nothing had ever landed on the wrong side of a boundary before.
   */
  const s = Math.max(0, seconds);
  const secs = Math.round(s);
  if (secs < 60) return `${secs}s`;
  const mins = Math.round(s / 60);
  if (mins < 60) return `${mins} min`;
  const totalHours = Math.round(mins / 60);
  if (mins < 1440) {
    const h = Math.floor(mins / 60);
    const m = mins % 60;
    return m ? `${h}h ${m}min` : `${h}h`;
  }
  const d = Math.floor(totalHours / 24);
  const h = totalHours % 24;
  return h ? `${d}d ${h}h` : `${d}d`;
}
