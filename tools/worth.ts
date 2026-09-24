/**
 * 值 What each source of power is actually worth, measured on a real cultivator.
 *
 * Bruno: *"Sistema de equipamentos atual é relevante?"* It is a fair question to ask of
 * every system and not only of gear, and it is answerable exactly: take a cultivator the
 * harness has played up the climb, strip one source out of the save, and divide.
 *
 * 法 The division is the whole method. power() multiplies its terms, so removing one and
 * comparing tells you what that term is carrying, with no double counting and nothing to
 * argue about. A source worth ×1.0 is a screen the player is visiting for nothing.
 *
 *     npm run worth
 */
import { power, type State } from '../src/sim/state.ts';
import { play, HABITS } from './habits.ts';

interface Source {
  readonly han: string;
  readonly name: string;
  /** The same save with this source taken away. */
  readonly without: (s: State) => State;
  readonly note: string;
}

export const SOURCES: readonly Source[] = [
  { han: '劍訣', name: 'technique levels', note: 'bought with qi, capped by the realm',
    without: (s) => ({ ...s, levels: { ...s.levels, technique: 0 } }) },
  { han: '妖丹', name: 'beast cores', note: 'bought with 材 material only',
    without: (s) => ({ ...s, levels: { ...s.levels, cores: 0 } }) },
  { han: '器', name: 'the gear worn', note: 'what falls off beasts, refined in 煉器',
    without: (s) => ({ ...s, worn: {} }) },
  { han: '道', name: 'the path tree', note: 'points earned, never bought',
    without: (s) => ({ ...s, unlocked: [] }) },
  { han: '丹', name: 'pills brewed', note: 'qi poured into 爐 the furnace',
    without: (s) => ({ ...s, brewed: { body: 0, bane: 0, fortune: 0 } }) },
  { han: '錄', name: 'the record', note: 'every beast ever killed, for ever',
    without: (s) => ({ ...s, killed: {} }) },
  { han: '雷池', name: 'tribulation marks', note: 'crossings above the ninth realm',
    without: (s) => ({ ...s, tribulation: 0 }) },
];

export interface Worth {
  readonly realm: number;
  readonly day: number;
  readonly total: number;
  readonly share: Readonly<Record<string, number>>;
}

/** 時 The climb sampled at the moment each realm is reached, and at the end. */
export function walk(habit = 'active', maxDays = 400): readonly Worth[] {
  const h = HABITS.find((x) => x.name === habit);
  if (!h) throw new Error(`值 there is no habit called ${habit}`);
  const out: Worth[] = [];
  let realm = 0;
  const sample = (day: number, s: State) => {
    const total = power(s);
    const share: Record<string, number> = {};
    for (const src of SOURCES) share[src.name] = total / Math.max(1e-9, power(src.without(s)));
    out.push({ realm: s.realm, day, total, share });
  };
  const run = play(h, maxDays, (day, s) => {
    if (s.realm > realm) { realm = s.realm; sample(day, s); }
  });
  sample(run.days, run.state);
  return out;
}

if (process.argv[1]?.endsWith('worth.ts')) {
  const rows = walk();
  const pad = (s: string, n: number) => s + ' '.repeat(Math.max(0, n - [...s].length));
  const x = (v: number) => (v >= 1000 ? `×${(v / 1000).toFixed(0)}k` : v >= 10 ? `×${v.toFixed(0)}` : `×${v.toFixed(2)}`);
  console.log('\n值 what each source multiplies a cultivator\'s 力 power by\n');
  console.log(`  ${pad('at realm', 10)}${SOURCES.map((s) => pad(s.han, 8)).join('')}`);
  for (const r of rows) {
    console.log(`  ${pad(String(r.realm), 10)}${SOURCES.map((s) => pad(x(r.share[s.name]), 8)).join('')}`);
  }
  console.log();
  const last = rows[rows.length - 1];
  for (const s of SOURCES) {
    console.log(`  ${pad(s.han, 6)} ${pad(s.name, 20)} ${pad(x(last.share[s.name]), 9)} ${s.note}`);
  }
  console.log(`\n  力 ${last.total.toExponential(2)} at the top of the climb.\n`);
}
