import type { Stats } from '../sim/camp.ts';

/**
 * A plausible mid-game player, so every screen can be judged against real numbers rather
 * than lorem ipsum. This file is the *only* place invented state lives; when the real
 * save arrives it replaces this import and nothing else changes.
 */
export interface Player {
  readonly name: string;
  readonly stats: Stats;
  readonly unspent: number;
  readonly band: number;
  readonly qi: number;
  readonly day: number;
}

export const YOU: Player = {
  name: '無名',
  stats: { body: 18, qi: 22, spirit: 11, bone: 16, intent: 14 },
  unspent: 3,
  band: 4,
  qi: 48_300,
  day: 23,
};

/** What the server has opened, and how far the offering has got toward the next seal. */
export const SERVER = {
  frontier: 6,
  offering: 0.58,
  offered: 41_200_000,
  needed: 71_000_000,
  climbers: 8_412,
  /** How the server is spread across the mountain, band 1..9. */
  population: [3120, 2280, 1410, 830, 460, 312, 0, 0, 0],
};

export const SECT = {
  han: '寒山',
  name: 'Cold Mountain',
  members: 38,
  rank: 7,
  contributors: [
    { name: '劍一', band: 6, given: 2_140_000 },
    { name: '青鶴', band: 5, given: 1_880_000 },
    { name: '無名', band: 4, given: 1_410_000, you: true },
    { name: '石心', band: 5, given: 1_120_000 },
    { name: '夜行', band: 4, given: 940_000 },
  ],
};
