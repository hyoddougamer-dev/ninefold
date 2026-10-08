import { realm as realmOf } from '../../data/realms.ts';
import { HUNT } from '../copy.ts';

/**
 * 境 A beast's realm as a quiet mark: "R5" in the realm's own colour, with the realm's name in
 * its label and title. It tells the hunter which realm's gear the beast leaves (a realm-5
 * beast leaves sword5), and it is the same small chip wherever a beast is named: the hunt
 * row, the drive sheet and the arena. It carries no rule of its own for any of them; each
 * screen only places it (see `.rtag` in theme.css).
 */
export function RealmTag({ realm }: { realm: number }) {
  const r = realmOf(realm);
  const label = HUNT.realmLabel(r.n, r.name);
  return (
    <span className="rtag" role="img" aria-label={label} title={label}
      style={{ ['--rc' as string]: r.colour }}>{HUNT.realmTag(r.n)}</span>
  );
}
