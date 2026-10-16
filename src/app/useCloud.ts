import { useCallback, useEffect, useRef, useState, type MutableRefObject } from 'react';
import * as cloud from '../net/cloud.ts';
import type { State } from '../sim/state.ts';
import { importSave } from '../sim/save.ts';
import { progressOf } from '../sim/echo.ts';
import { now } from './clock.ts';

/**
 * 榜 The ranked server, as the screen uses it: who is signed in, when the save was last
 * synced, a sync that is pulled back from an email link, and the sync that goes out on a
 * timer and when the app is put away. Nothing here waits on the network to play.
 */
export function useCloud(ready: boolean, latest: MutableRefObject<State>) {
  // ── 榜 The ranked server ────────────────────────────────────────────────
  // A player who has signed in is synced when the game opens, every five minutes, and
  // whenever the app is put away. Nothing here waits on the network to play: a sync that
  // fails is a sync that did not happen, and the game goes on exactly as it was.
  const [ranks, setRanks] = useState(false);
  const [who, setWho] = useState<cloud.Who | null>(null);
  const [synced, setSynced] = useState<cloud.Synced | null>(null);
  const [syncedAt, setSyncedAt] = useState<number | null>(null);
  // 拒 Why the last sync came back empty, if it did: a closed account and an unreachable
  // server used to read alike, as "Not synced yet", for a day (speculaether, 2026-10-04).
  const [syncError, setSyncError] = useState<string | null>(null);
  const [cloudPick, setCloudPick] = useState<{ there: State; here: State } | null>(null);
  const [title, setTitle] = useState<string | null>(null);
  const [place, setPlace] = useState<number | null>(null);
  /**
   * 先行 Whether the server says this account walked the closed test (my_standing().forerunner):
   * null until it has answered, and again whenever nobody is signed in.
   */
  const [forerunner, setForerunner] = useState<boolean | null>(null);
  /**
   * 位 What the server last said about where this account stands (my_standing()): the sect rank
   * and where the Cliff carved it, for the 修 mark and the one rise card. Null signed out.
   */
  const [standing, setStanding] = useState<cloud.Mine | null>(null);
  /** 名 The name the boards show for the signed-in account, as the server last said it. */
  const [myName, setMyName] = useState<string | null>(null);
  const pushing = useRef(false);
  /**
   * Offer the save to the server. Answers how many seconds to wait before offering it again when
   * it could not be taken just now (another sync in flight, or the server's minimum gap), and 0
   * otherwise, so a caller that cannot wait for the next five-minute sync can come back.
   */
  const push = useCallback(async (name?: string): Promise<number> => {
    if (pushing.current) return 5;
    pushing.current = true;
    let again = 0;
    // 名 The name typed before an email link rides on every sync until one lands, not only
    // the first after the link: that one can fail (offline, a moment's error), or wait behind
    // the cloud-or-device question, and the timer's next sync has no name of its own. The
    // server reads a name only when it makes the profile, so an account with one keeps it.
    const n = name ?? cloud.wantedName();
    try {
      const r = await cloud.sync(latest.current, n);
      if ('error' in r) {
        if (r.error !== 'too-soon') setSyncError(r.error);
        else again = Math.max(1, Math.ceil(Number(r.wait) || 20));
      } else {
        setSyncError(null);
        // A name kept for the link has done its one job once a sync has gone.
        if (n !== undefined) cloud.forgetWantedName();
        setSynced(r); setSyncedAt(Date.now() / 1000);
        cloud.mine().then((m) => {
          setTitle(m?.title ?? null);
          setStanding(m);
          if (m) { setForerunner(!!m.forerunner); setMyName(m.name); }
        }).catch(() => {});
        cloud.place().then(setPlace).catch(() => {});
      }
    } catch { setSyncError('offline'); /* the next one will do */ }
    pushing.current = false;
    return again;
  }, []);
  useEffect(() => {
    if (!ready) return;
    // Read before anything else runs: the library takes the link out of the address as
    // soon as it has read it, and after that there is no telling it was ever there.
    const fromLink = cloud.returningFromLink();
    if (!cloud.remembered() && !fromLink) return;
    let live = true;
    (async () => {
      const w = await cloud.who().catch(() => null);
      if (!live || !w) return;
      setWho(w);
      // 雲 Arriving from an email link on a device that may not be the one the cultivator
      // grew up on: if the cloud holds one further along, ask which goes on.
      if (fromLink && !w.guest) {
        const got = await cloud.pull().catch(() => null);
        const there = got?.save ? importSave(JSON.stringify(got.save), now()).state : null;
        history.replaceState(null, '', location.pathname);
        if (there && progressOf(there) > progressOf(latest.current)) {
          setCloudPick({ there, here: latest.current });
          return;
        }
      }
      // 名 The name typed before the link was sent rides on the sync (push reads it).
      void push();
    })();
    return () => { live = false; };
  }, [ready, push]);
  // 先行 Asked as soon as somebody is signed in, without waiting for a sync: the season's card
  // and the Account block say it from the server's own answer, never from anything on the
  // device. A sign-out forgets it, so the next account is asked afresh.
  useEffect(() => {
    if (!who) { setForerunner(null); setStanding(null); setMyName(null); return; }
    let live = true;
    cloud.mine().then((m) => { if (live && m) { setForerunner(!!m.forerunner); setStanding(m); setMyName(m.name); } }).catch(() => {});
    return () => { live = false; };
  }, [who]);
  useEffect(() => {
    if (!who) return;
    const id = setInterval(() => { void push(); }, 5 * 60 * 1000);
    const away = () => { if (document.visibilityState === 'hidden') void push(); };
    document.addEventListener('visibilitychange', away);
    return () => { clearInterval(id); document.removeEventListener('visibilitychange', away); };
  }, [who, push]);

  return {
    ranks, setRanks, who, setWho, synced, setSynced, syncedAt, syncError, setSyncError,
    cloudPick, setCloudPick, title, setTitle, place, setPlace, push, forerunner, standing, myName, setMyName,
  };
}
