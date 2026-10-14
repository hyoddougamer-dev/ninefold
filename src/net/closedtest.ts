/**
 * 舊 The closed-test cultivator, brought back from the account.
 *
 * Bruno, 2026-10-14 (option 1): a player whose only copy of the closed-test cultivator was in
 * the cloud (a lost phone, a new device, a cleared browser) still gets it back after the
 * switch. The server keeps that copy (saves.closed_test) and hands it to its own player alone;
 * this asks for it and keeps it on the device as a retired save is kept (keepFromAccount).
 *
 * It asks only when there is something to ask: the season has begun, the player is signed in
 * (a guest is), and this device holds no closed-test copy of its own. A copy already here is
 * never written over. The network is never waited on to play: a failed ask is no answer, and
 * the next one tries again.
 */
import { SEASON_START } from '../sim/season.ts';
import { holdsClosedTest, keepFromAccount, type ClosedTest } from '../sim/save.ts';

export type Ask = () => Promise<{ save: unknown } | null>;

/** The copy the account handed back, now kept here, or null when nothing was kept. */
export async function bringBack(now: number, signedIn: boolean, ask: Ask): Promise<ClosedTest | null> {
  if (now < SEASON_START || !signedIn || holdsClosedTest()) return null;
  let got: { save: unknown } | null;
  try { got = await ask(); } catch { return null; }
  return got?.save ? keepFromAccount(got.save, now) : null;
}
