/**
 * 擂台 The Platform's tempers: the one thing about a week's challengers that a build can
 * answer in advance.
 *
 * Each period carries one of four, and a challenger whose temper goes unanswered stands
 * TEMPER_EDGE above itself. A stance or one art in the sequence answers it, so the card
 * on 塔 Trials is a question with an answer the cultivator already holds: every temper
 * has an answer held by the fourth realm, where the Platform opens.
 *
 * Names here, as ROOM_INFO's are; what each one says to the player is in app/copy.ts.
 */

export type TemperKey = 'armoured' | 'nimble' | 'mending' | 'frenzied';

export interface Temper {
  readonly key: TemperKey;
  readonly han: string;
  readonly name: string;
  /** The stances that answer it, by key (data/arts.ts). */
  readonly stances: readonly string[];
  /** The arts that answer it, any one of them in the sequence. */
  readonly arts: readonly string[];
}

export const TEMPERS: readonly Temper[] = [
  // 堅 A shell: what breaks it is a harder blow.
  { key: 'armoured', han: '堅', name: 'Armoured', stances: ['fierce', 'reckless'], arts: ['ape', 'tiger'] },
  // 捷 Quick: what answers it is not being where it strikes.
  { key: 'nimble', han: '捷', name: 'Nimble', stances: ['guard', 'mirror'], arts: ['fox', 'dragon'] },
  // 癒 It heals: what answers it is pressing faster than it mends, or binding it.
  { key: 'mending', han: '癒', name: 'Mending', stances: ['swift', 'entangle'], arts: ['crane', 'wolf'] },
  // 狂 It comes on hard: what answers it is weathering the storm.
  { key: 'frenzied', han: '狂', name: 'Frenzied', stances: ['guard', 'endure', 'steady'], arts: ['turtle', 'puppet'] },
];

export const TEMPER_BY_KEY: Readonly<Record<TemperKey, Temper>> =
  Object.fromEntries(TEMPERS.map((t) => [t.key, t])) as Record<TemperKey, Temper>;
