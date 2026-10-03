import type { Away } from '../sim/save.ts';
import { RECIPE_BY_KEY, SKILL_BY_KEY } from '../data/crafts.ts';
import { BEASTS } from '../data/bestiary.ts';
import { duration } from '../sim/format.ts';
import { WORKSHOP_AWAY } from './copy.ts';
import { missingName } from './ready.ts';

/**
 * 業 The workshop's lines on 歸 the return card, in the order they happened: what it made,
 * then why it stood still and for how long. A night that made nothing still has a line,
 * because "nothing was made" with no reason is the one sentence that reads as a loss.
 */
export function workshopLines(a: Away): readonly string[] {
  const r = a.task ? RECIPE_BY_KEY[a.task] : undefined;
  const lines: string[] = [];
  if (r && a.made > 0) {
    lines.push(WORKSHOP_AWAY.made(a.made, r.name)
      + (a.to > a.from ? ` ${WORKSHOP_AWAY.level(SKILL_BY_KEY[r.skill].name, a.from, a.to)}` : ''));
  }
  if (!a.stood || a.still < 60) return lines;
  const span = duration(a.still);
  const after = lines.length > 0;
  switch (a.stood) {
    case 'limit':
      lines.push(WORKSHOP_AWAY.rested(span, a.hours));
      break;
    case 'needs': {
      const what = missingName(a.missing ?? 'mat');
      lines.push(after || !r ? WORKSHOP_AWAY.waitedAfter(span, what) : WORKSHOP_AWAY.waited(span, what, r.name));
      break;
    }
    case 'chest':
      lines.push(after ? WORKSHOP_AWAY.roomAfter(span) : WORKSHOP_AWAY.room(span));
      break;
    case 'remains': {
      const beast = r?.remains ? BEASTS.find((b) => b.key === r.remains)?.name ?? r.remains : '';
      lines.push(WORKSHOP_AWAY.know(span, beast));
      break;
    }
    case 'idle':
      lines.push(after ? WORKSHOP_AWAY.doneAfter(span) : r ? WORKSHOP_AWAY.done(span) : WORKSHOP_AWAY.none(span, a.hours));
      break;
  }
  return lines;
}
