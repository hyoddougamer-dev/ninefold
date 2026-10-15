import { FORERUNNER } from '../copy.ts';
import { Term } from './Term.tsx';

/**
 * 先行 The Forerunner seal: two glyphs stacked in a small gold-bordered square, drawn in CSS so
 * the carving is always exactly 先行 (docs/SEASON0-THEME.md, 2d). Never 先 alone: beside a name
 * it reads "the late". It answers a tap with its 註 note, and its English name is its label.
 *
 * Each screen that wears it passes its own class, and styles that class under its own scope:
 * one seal, never one shared class (CLAUDE.md).
 */
export function ForerunnerSeal({ className }: { className: string }) {
  return (
    <Term han={FORERUNNER.han} bare
      entry={{ han: FORERUNNER.han, name: FORERUNNER.name, note: FORERUNNER.note }}>
      <span className={className} role="img" aria-label={FORERUNNER.name}>
        <i>{FORERUNNER.han[0]}</i><i>{FORERUNNER.han[1]}</i>
      </span>
    </Term>
  );
}
