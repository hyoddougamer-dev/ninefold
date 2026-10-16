/** 冠 The titles the boards hand out. Nobody may wear one as a name. */
export const TITLES = ['天下第一', '期首', '期十', '期百'];

/**
 * 先行 The marks a name wears beside it, never inside it: the Forerunner seal is its own column on
 * every board, so a name carrying the glyphs would wear it without having earned it. Kept out
 * exactly as the titles are (set_name(), 20261015100400_name_mark.sql).
 */
export const MARKS = ['先行'];

/**
 * 名 A name as the boards will show it, or null if it cannot be one.
 *
 * The sync used to take whatever the phone sent and cut it at twenty UTF-16 units: 天下第一
 * as a name, a zero-width space inside "Bruno", a right-to-left override. The same rules
 * as set_name() in the database, in the same order: folded to one form (NFKC, so a
 * full-width ｂｒｕｎｏ is bruno), invisible and control characters removed, Latin letters,
 * digits, CJK and a little punctuation only, two to twenty characters, and never a title,
 * the 先行 mark or the 修士 prefix a default name wears.
 */
export function cleanName(raw: unknown): string | null {
  if (typeof raw !== 'string') return null;
  const folded = raw.normalize('NFKC').replace(/[\p{C}\p{Z}]+/gu, ' ').replace(/\s+/g, ' ').trim();
  const chars = [...folded];
  if (chars.length < 2 || chars.length > 20) return null;
  if (!/^[A-Za-z0-9 _\-.㐀-鿿]+$/.test(folded)) return null;
  if ([...TITLES, ...MARKS].some((t) => folded.includes(t)) || folded.startsWith('修士')) return null;
  return folded;
}

/**
 * 修士 The placeholder a profile wears until its player chooses a name: 修士 and eight letters
 * of the account (defaultName() in the sync function). cleanName() refuses it as a name, so a
 * name that starts with it was never chosen by anybody.
 */
export const PLACEHOLDER = '修士';
export function isPlaceholder(name: string | null | undefined): boolean {
  return typeof name === 'string' && name.startsWith(PLACEHOLDER);
}
