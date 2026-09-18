/**
 * 沙 sim — the whole game, as pure functions from (state, instant) to a new state.
 *
 * GDD §11 rule 1: no nodes, no signals, no wall-clock reads, no randomness that is not
 * a stable hash of the state. Nothing in here imports anything from `app/`. This is what
 * lets the same code run the game, the tests, a fifty-day simulation, and — once the
 * sect layer lands — the server-side revalidation of a submitted save.
 */
export * from './balance';
export * from './core';
export * from './hunt';
export * from './save';
export * from './time';
export * from './trail';
export type * from './types';
