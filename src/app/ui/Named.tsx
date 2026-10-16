import { Term } from './Term.tsx';
import { RANKS } from '../copy.ts';
import { PLACEHOLDER, isPlaceholder } from '../../net/names.ts';

/**
 * 修士 A name on a board, and a placeholder that explains itself.
 *
 * A profile that never chose a name wears 修士 and eight letters of its account, and on the
 * boards ten of those read as ten copies of one mysterious cultivator. Tapped, it says what it
 * is. A chosen name is only text.
 */
export function Named({ name }: { name: string }) {
  if (!isPlaceholder(name)) return <>{name}</>;
  return (
    <span className="rnamed">
      <Term han={PLACEHOLDER} entry={RANKS.placeholder} plain>{name}</Term>
    </span>
  );
}
